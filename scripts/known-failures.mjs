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
function failLinesOf(output) {
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
 * A retried test emits one FAIL block per attempt, so the raw line list can repeat a
 * title while vitest's own tally still counts that test once. Measured on run
 * 36365309333: 960 FAIL lines against 947 failed tests + 12 collection errors, which made
 * the completeness guard refuse the whole comparison before any drift could be judged.
 * A baseline is a set of titles, so the repeat carries no extra fact.
 */
export function parseVitestOutput(output) {
  return [...new Set(failLinesOf(output))];
}

/** How many FAIL lines parseVitestOutput collapsed -- reported out loud, never silently. */
export function collapsedFailLines(output) {
  const all = failLinesOf(output);
  return all.length - new Set(all).size;
}

/**
 * FAIL lines vitest printed but did not count as failed tests, identified by the file's own
 * tally line: `src/x.test.ts (8 tests | 8 skipped)` reports zero failed tests, so the suite-level
 * FAIL above it belongs to no test. Two shapes reach this: a hook that throws before any test
 * runs (the whole file skips), and a test that fails, retries and then passes.
 *
 * Both are real signals and neither is a failed test, so the completeness equation must account
 * for them separately instead of refusing to judge drift. Measured on the win32 workstation run
 * behind 931 parsed entries vs 923 failed + 7 collection.
 */
export function uncountedFailEntries(output) {
  const lines = stripAnsi(output).split('\n').map((l) => stripRunnerPrefix(l).trim());
  const failedByFile = new Map();
  for (const line of lines) {
    const m = line.match(/^[❯✓×]\s+(\S+\.test\.ts)\s+\(\d+ tests?(?:\s*\|\s*([^)]*))?\)/);
    if (!m) continue;
    const failed = /(\d+) failed/.exec(m[2] ?? '');
    failedByFile.set(m[1].replace(/\\/g, '/'), failed ? Number(failed[1]) : 0);
  }
  return parseVitestOutput(output).filter((entry) => {
    const file = entry.split(' > ')[0];
    // Absent from the map means a collection error, which vitest counts on its own side.
    return failedByFile.get(file) === 0 && !entry.includes(' [ ');
  });
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
 * Per-file view of one log: each test file's own tally row beside the raw FAIL lines printed
 * under it. Two legitimate shapes make the raw line count differ from vitest's failed-test
 * count, and neither may be mistaken for a truncated log:
 * - a hook that throws after its test already failed prints a second FAIL block under the
 *   same title, while the file's row still counts the test once. Measured 2026-10-10 on the
 *   v5.2.0 transition log: hud-marketplace-resolution reported (5 tests | 1 failed) and
 *   printed the test body's ENOENT plus the afterEach cleanup's EPERM;
 * - a hook that throws in a file whose tests all end up skipped prints one FAIL line for a
 *   file whose own tally reports zero failed tests (submodule-state-anchor).
 * `excess` counts those surplus lines; `missing` is the fail-closed side -- a file that
 * printed fewer FAIL lines than its own row's failed count is a truncated log, never an
 * accounting artifact. `countedFailures` sums every row's failed count and must equal
 * vitest's `Tests N failed`: a mismatch means a whole file fell out of the log.
 *
 * The row pattern is deliberately broader than the one in `uncountedFailEntries` (which
 * predates this function): `.bench.ts` and `.test.mjs` files carry rows and failed counts
 * too, and leaving them out of the sum would make a complete log look like a lost one.
 */
export function failLineAccounting(output) {
  const lines = stripAnsi(output).split('\n').map((l) => stripRunnerPrefix(l).trim());
  const rows = new Map();
  const linesByFile = new Map();
  let collectionLines = 0;
  for (const line of lines) {
    const row = /^[❯✓×]\s+(\S+\.(?:test|spec|bench)\.[a-z]+)\s+\(\d+\s+tests?(?:\s*\|\s*([^)]*))?\)/.exec(line);
    if (row) {
      const file = row[1].replace(/\\/g, '/');
      if (!rows.has(file)) {
        const failed = /(\d+)\s+failed/.exec(row[2] ?? '');
        rows.set(file, failed ? Number(failed[1]) : 0);
      }
      continue;
    }
    const fail = /^\s*FAIL\s+(.+)$/.exec(line);
    if (!fail) continue;
    // A FAIL line carrying a bracketed file suffix is a module-level collection error:
    // the file counts as failed but contributes no test to the `Tests N failed` tally.
    if (/^\S+ \[\s*\S+\s*\]$/.test(fail[1].trim())) {
      collectionLines++;
      continue;
    }
    const entry = fail[1].trim().replace(/\\/g, '/');
    const file = entry.split(' > ')[0];
    const record = linesByFile.get(file) ?? { lines: 0, titles: new Set() };
    record.lines++;
    record.titles.add(entry);
    linesByFile.set(file, record);
  }
  let countedFailures = 0;
  for (const failed of rows.values()) countedFailures += failed;
  let excessLines = 0;
  const excess = [];
  const missing = [];
  // Every file either side knows about: a file whose row survives but whose FAIL lines were
  // lost (0 lines against M failed) is the shape a dropped log chunk leaves behind, and it
  // must be named rather than left to the total equation to notice.
  for (const file of new Set([...rows.keys(), ...linesByFile.keys()])) {
    const failed = rows.get(file) ?? 0;
    const record = linesByFile.get(file);
    const lines = record ? record.lines : 0;
    if (lines < failed) missing.push({ file, lines, failed });
    if (lines > failed) {
      excessLines += lines - failed;
      excess.push({ file, lines, failed });
    }
  }
  return { rows, linesByFile, collectionLines, countedFailures, excessLines, excess, missing };
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
      const uncounted = uncountedFailEntries(vitestOutput);
      // `parseVitestOutput` dedupes; the raw FAIL-line count is what equals the
      // tally's arithmetic. Measured 2026-10-09 on the v5.1.0 transition log:
      // 1455 deduped + 2 duplicate lines = 1457 = 1445 failed tests + 11
      // collection errors + 1 uncounted line. Comparing the deduped count alone
      // refused every log carrying a retried attempt.
      const collapsed = collapsedFailLines(vitestOutput);
      const accounting = failLineAccounting(vitestOutput);
      if (tally.tests !== null) {
        // The files' own tallies must sum to the run summary. A whole file that fell out of
        // the log (row and FAIL lines together) is invisible to every line-based count, and
        // this is the one anchor that sees it.
        if (accounting.countedFailures !== tally.tests) {
          console.error(`\n❌ Incomplete parse: the per-file tallies sum to ${accounting.countedFailures} failed test(s),`
            + ` but the run summary reports ${tally.tests}. A whole file's output is missing from this log.`);
          process.exit(1);
        }
        // Fail-closed: a file that printed fewer FAIL lines than its own row's failed count
        // cannot be an accounting artifact -- lines are missing from the log.
        if (accounting.missing.length > 0) {
          console.error(`\n❌ Incomplete parse: ${accounting.missing.length} file(s) printed fewer FAIL lines than their own tally reports:`);
          accounting.missing.forEach((m) => console.error(`  - ${m.file}: ${m.lines} FAIL line(s) against ${m.failed} failed test(s)`));
          process.exit(1);
        }
        // The equation counts the FAIL lines vitest prints but does not tally as failed tests
        // while the file DOES report failures -- a hook failing after its test already failed,
        // or an attempt that failed and was retried. Without that term the equation refuses
        // legitimate logs instead of truncated ones: measured 2026-10-10 on the v5.2.0
        // transition log, 975 + 2 = 966 failed tests + 9 collection errors + 2 such lines,
        // where the old form demanded 975 + 2 === 966 + 9 + 1 and refused the whole run.
        const rawFailLines = actualFailures.length + collapsed;
        const expected = tally.tests + tally.collection + accounting.excessLines;
        if (rawFailLines !== expected) {
          console.error(`\n❌ Incomplete parse: ${actualFailures.length} FAIL entries (+${collapsed} collapsed duplicate line(s)) read, but vitest reported`
            + ` ${tally.tests} failed tests + ${tally.collection} module-level collection errors`
            + ` + ${accounting.excessLines} FAIL line(s) beyond a file's own failed count = ${expected}.`
            + ` The log is truncated or the parser stopped matching.`);
          process.exit(1);
        }
      }
      const parsedFiles = new Set(actualFailures.map(f => f.split(' > ')[0])).size;
      if (tally.files !== null && parsedFiles !== tally.files) {
        console.error(`\n❌ Incomplete parse: ${parsedFiles} failing files read, but vitest reported ${tally.files}.`);
        process.exit(1);
      }
      console.log(`Completeness: ${actualFailures.length} entries = ${tally.tests} tests + ${tally.collection} collection`
        + ` across ${parsedFiles} files (vitest tally agrees)`);
      // Say it out loud rather than absorb it: collapsing is right for retries, but the
      // same shape also hides two tests that share a title, and that is a test-side bug.
      if (collapsed) {
        console.log(`Note:    ${collapsed} duplicate FAIL line(s) collapsed -- retried attempts, or two tests sharing a title.`);
      }
      if (uncounted.length) {
        console.log(`Note:    ${uncounted.length} FAIL line(s) belong to a file whose own tally reports 0 failed tests`
          + ` (a hook that skipped the file, or a test that passed on retry):`);
        uncounted.forEach((f) => console.log(`  - ${f}`));
      }
      if (accounting.excessLines) {
        console.log(`Note:    ${accounting.excessLines} FAIL line(s) sit beyond a file's own failed count`
          + ` (a hook failing after its test, a retried attempt, or a file whose tests all skipped):`);
        accounting.excess.forEach((e) => console.log(`  - ${e.file} (${e.lines} FAIL line(s), ${e.failed} counted failure(s))`));
      }
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
      // Echo the baseline that was actually opened: both CI jobs share this script and
      // only the win32 one passes --baseline, so naming the linux file sent a Windows
      // red run to edit the wrong tracked file. Baselines are authored from CI logs
      // (a workstation parse disagrees with the runner by ~2.5%), hence the tool name.
      console.error(`\nBaseline mismatch. Re-author ${baselinePath} from a CI run:`);
      console.error('  node scripts/ci/author-known-failures.mjs --linux-log=<log> --win32-log=<log> --run=<runId@sha>');
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
