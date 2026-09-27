#!/usr/bin/env node
/**
 * Known-failures baseline checker.
 * 
 * Parses vitest output and compares against a baseline of known failures.
 * CI fails on:
 * - New failures not in baseline
 * - Baseline entries that no longer fail (stale baseline)
 * 
 * Handles ANSI escape sequences in two encodings:
 * - Real ESC bytes: \x1b[31m
 * - Literal caret notation: ^[[31m
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'node:url';

/**
 * Strip ANSI escape sequences from text.
 * Handles both real ESC bytes (\x1b[...) and literal caret notation (^[[...).
 */
export function stripAnsi(text) {
  // First, normalize literal caret notation to real ESC
  // ^[[ is the literal representation of ESC[
  let normalized = text.replace(/\^\[\[/g, '\x1b[');
  
  // Strip ANSI escape sequences
  // Matches: ESC[<params>m, ESC[<params>H, ESC[<params>J, etc.
  return normalized.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Remove a GitHub Actions log prefix: `<job>\t<step>\t<ISO timestamp>Z `.
 *
 * Without this, "FAIL" never sits at the start of a line and a log holding dozens
 * of failures parses as zero -- which is indistinguishable from "suite is green".
 * Step names contain spaces ("Test (captured)") and a test title may itself
 * contain "Z ", so the fields are anchored on tabs and the timestamp is matched
 * as a whole instead of located with indexOf('Z ').
 */
export function stripRunnerPrefix(line) {
  const match = /^[^\t]+\t[^\t]+\t\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z /.exec(line);
  return match ? line.slice(match[0].length) : line;
}

/**
 * Parse vitest output and extract failed test lines.
 * 
 * Vitest output format:
 *  FAIL  src/path/to/test.test.ts > test name > nested name
 * 
 * Returns array of normalized failure lines.
 */
export function parseVitestOutput(output) {
  const cleaned = stripAnsi(output);
  const lines = cleaned.split('\n');
  const failures = [];

  for (const rawLine of lines) {
    const line = stripRunnerPrefix(rawLine);
    // Match FAIL lines: " FAIL  path > test name"
    const match = line.match(/^\s*FAIL\s+(.+)$/);
    if (match) {
      const failLine = match[1].trim();
      // Normalize path separators to forward slashes
      const normalized = failLine.replace(/\\/g, '/');
      failures.push(normalized);
    }
  }
  
  return failures;
}

/**
 * vitest's own tally of the same run. The parsed FAIL-line count must equal
 * failed tests plus module-level collection errors, or the log this tool read
 * is not the whole run: a tee that dropped its tail, a truncated artifact, or a
 * parse that stopped matching all look like "fewer failures" -- which the delta
 * gate would otherwise report as an improvement.
 *
 * A FAIL line carrying a bracketed file suffix is a collection error: the file
 * counts as failed but contributes no test to the `Tests N failed` tally.
 */
export function vitestTally(output) {
  const lines = stripAnsi(output).split('\n').map(l => stripRunnerPrefix(l).trim());
  // vitest prints `Tests  276 failed | 12716 passed | 38 skipped (13030)`, but
  // when nothing failed the "N failed" segment is omitted entirely -- so a
  // present summary line without it means zero, not unknown. Treating that as
  // unknown would make --require-summary red the day the suite goes green.
  const summary = label => {
    const hit = lines.find(l => new RegExp(`^${label}\\s+\\d+\\s`).test(l));
    if (!hit) return null;
    const m = /(\d+) failed\b/.exec(hit);
    return m ? Number(m[1]) : 0;
  };
  return {
    tests: summary('Tests'),
    files: summary('Test Files'),
    collection: lines.filter(l => /^FAIL\s+\S+\s+\[\s*\S+\s*\]$/.test(l)).length,
  };
}

/**
 * Load baseline from JSON file.
 * Expected format:
 * {
 *   "metadata": {
 *     "platform": "linux",
 *     "generatedAt": "2026-01-01T00:00:00Z",
 *     "fileCount": 17,
 *     "testCount": 47
 *   },
 *   "failures": [
 *     "src/path/test.test.ts > test name",
 *     ...
 *   ]
 * }
 */
export function loadBaseline(baselinePath) {
  if (!existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }
  
  const content = readFileSync(baselinePath, 'utf8');
  const baseline = JSON.parse(content);
  
  if (!baseline.failures || !Array.isArray(baseline.failures)) {
    throw new Error('Baseline must contain a "failures" array');
  }
  
  return baseline;
}

/**
 * Compare actual failures against baseline.
 * Returns { newFailures, staleEntries, matchedCount }
 */
export function compareFailures(actualFailures, baselineFailures) {
  const actualSet = new Set(actualFailures);
  const baselineSet = new Set(baselineFailures);
  
  const newFailures = actualFailures.filter(f => !baselineSet.has(f));
  const staleEntries = baselineFailures.filter(f => !actualSet.has(f));
  const matchedCount = actualFailures.filter(f => baselineSet.has(f)).length;
  
  return { newFailures, staleEntries, matchedCount };
}

/**
 * Main check function.
 */
function main() {
  const args = process.argv.slice(2);
  const argValue = name => {
    const hit = args.find(a => a.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : undefined;
  };
  const checkMode = args.includes('--check');
  const requireSummary = args.includes('--require-summary');
  const baselineArg = args.find(a => a.startsWith('--baseline='));
  const baselinePath = baselineArg 
    ? baselineArg.split('=')[1] 
    : resolve(process.cwd(), 'tests/known-failures-linux.json');
  
  // Read vitest output from stdin
  const chunks = [];
  const stdin = process.stdin;
  
  stdin.setEncoding('utf8');
  stdin.on('data', chunk => chunks.push(chunk));
  
  stdin.on('end', () => {
    const vitestOutput = chunks.join('');
    
    if (!vitestOutput.trim()) {
      console.error('Error: No vitest output provided on stdin');
      console.error('Usage: npx vitest run | node scripts/known-failures.mjs --check');
      process.exit(2);
    }
    
    const actualFailures = parseVitestOutput(vitestOutput);
    const tally = vitestTally(vitestOutput);

    if (checkMode) {
      // The equation is checked here rather than only in the authoring tool,
      // because authoring is human-invoked and this path is what CI runs: a
      // parse that stopped matching a new failure shape must not read as green.
      if (requireSummary && (tally.tests === null || tally.files === null)) {
        console.error('Error: no "Tests N failed" / "Test Files N failed" summary in the input'
          + ` (tests=${tally.tests} files=${tally.files}) -- cannot prove this log is complete.`);
        process.exit(2);
      }
      if (tally.tests !== null && actualFailures.length !== tally.tests + tally.collection) {
        console.error(`\n❌ Incomplete parse: ${actualFailures.length} FAIL entries read, but vitest reported`
          + ` ${tally.tests} failed tests + ${tally.collection} module-level collection errors`
          + ` = ${tally.tests + tally.collection}. The log is truncated or the parser stopped matching.`);
        process.exit(1);
      }
      const parsedFiles = new Set(actualFailures.map(f => f.split(' > ')[0])).size;
      if (tally.files !== null && parsedFiles !== tally.files) {
        console.error(`\n❌ Incomplete parse: ${parsedFiles} failing files read, but vitest reported ${tally.files}.`);
        process.exit(1);
      }
      console.log(`Completeness: ${actualFailures.length} entries = ${tally.tests} tests + ${tally.collection} collection`
        + ` across ${parsedFiles} files (vitest tally agrees)`);
      // Blind spot, stated rather than hidden: vitest's `Errors` line reports
      // unhandled rejections that print no FAIL line, so they exist in neither
      // the baseline nor the equation above.
      const errLine = stripAnsi(vitestOutput).split('\n').map(stripRunnerPrefix)
        .map(l => l.trim()).find(l => /^Errors\s+\d+/.test(l));
      if (errLine) console.log(`Note: vitest reports "${errLine}" -- unhandled errors carry no FAIL line and are not gated.`);
    }
    
    if (!checkMode) {
      // Generate baseline mode
      const baseline = {
        metadata: {
          // Explicit, not ambient: a Linux baseline is usually regenerated from a
          // Windows workstation, so process.platform would label it wrongly, and a
          // generatedAt timestamp makes the tracked file diff on every run.
          platform: argValue('--platform') ?? process.platform,
          source: argValue('--source') ?? null,
          fileCount: new Set(actualFailures.map(f => f.split(' > ')[0])).size,
          testCount: actualFailures.length
        },
        failures: actualFailures.sort()
      };
      
      console.log(JSON.stringify(baseline, null, 2));
      process.exit(0);
    }
    
    // Check mode: compare against baseline
    let baseline;
    try {
      baseline = loadBaseline(baselinePath);
    } catch (err) {
      console.error(`Error loading baseline: ${err.message}`);
      process.exit(2);
    }
    
    // Measured-flake exemption. A win32 suite of this size flips 0.5%-1.2% of its
    // tolerated entries per run even when nothing a test can see has changed, so
    // without this the delta gate would be red on almost every push and stop being
    // read. Titles enter the list only via scripts/ci/derive-flake-list.mjs, and
    // exemption is symmetric: a listed title neither reports as new nor as stale.
    const flakePath = argValue('--flake-list');
    let flaky = new Set();
    if (flakePath) {
      let list;
      try {
        list = JSON.parse(readFileSync(flakePath, 'utf8'));
      } catch (err) {
        console.error(`Error loading flake list: ${err.message}`);
        process.exit(2);
      }
      const listPlatform = list.metadata?.platform;
      if (listPlatform && baseline.metadata?.platform && listPlatform !== baseline.metadata.platform) {
        console.error(`Error: flake list ${flakePath} declares platform "${listPlatform}" but the baseline declares "${baseline.metadata.platform}".`);
        process.exit(2);
      }
      flaky = new Set((list.entries ?? []).map(e => (typeof e === 'string' ? e : e.entry)));
    }
    const strip = arr => (flaky.size ? arr.filter(f => !flaky.has(f)) : arr);
    const suppressed = flaky.size ? actualFailures.filter(f => flaky.has(f)).length : 0;

    const { newFailures, staleEntries, matchedCount } = compareFailures(
      strip(actualFailures),
      strip(baseline.failures)
    );

    if (flaky.size) {
      console.log(`Flakes:   ${flakePath} holds ${flaky.size} titles, ${suppressed} of them failing this run (excluded both ways)`);
    }
    
    console.log(`Baseline: ${baseline.failures.length} known failures`);
    console.log(`Actual:   ${actualFailures.length} failures`);
    console.log(`Matched:  ${matchedCount}`);
    
    if (newFailures.length > 0) {
      console.error(`\n❌ ${newFailures.length} NEW failure(s) not in baseline:`);
      newFailures.forEach(f => console.error(`  - ${f}`));
    }
    
    if (staleEntries.length > 0) {
      console.error(`\n⚠️  ${staleEntries.length} stale baseline entry/ies (no longer failing):`);
      staleEntries.forEach(f => console.error(`  - ${f}`));
    }
    
    if (newFailures.length > 0 || staleEntries.length > 0) {
      console.error('\nBaseline mismatch. Update tests/known-failures-linux.json:');
      console.error('  npx vitest run | node scripts/known-failures.mjs > tests/known-failures-linux.json');
      process.exit(1);
    }
    
    console.log('\n✓ All failures match baseline');
    process.exit(0);
  });
  
  stdin.on('error', err => {
    console.error(`Error reading stdin: ${err.message}`);
    process.exit(2);
  });
}

// Guarded so the parser can be imported (src/__tests__/known-failures.test.ts
// already does, and scripts/ci/render-known-failures-doc.mjs must use the same
// rules the gate applies). main() reads stdin and process.exit()s on empty
// input, so an unguarded call here can kill any importer.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
