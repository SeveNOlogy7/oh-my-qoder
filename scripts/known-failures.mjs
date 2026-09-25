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
    // A GitHub Actions log prefixes every line with `<job>\t<step>\t<ts>Z `.
    // Without removing it, "FAIL" never sits at line start and a 49-failure
    // log parses as zero.
    const marker = rawLine.indexOf('Z ');
    const line = marker >= 0 && /^\S+\t\S+\t\d{4}-/.test(rawLine) ? rawLine.slice(marker + 2) : rawLine;
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
    
    const { newFailures, staleEntries, matchedCount } = compareFailures(
      actualFailures,
      baseline.failures
    );
    
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

main();
