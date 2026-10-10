#!/usr/bin/env node
/**
 * Author both known-failures baselines from CI logs and prove they round-trip.
 *
 * A baseline that is merely "generated" can still be wrong: if the parse that
 * produced it disagrees with the parse the gate uses, the next run goes red on
 * phantom drift. So this script writes each file and then immediately checks it
 * back through scripts/known-failures.mjs --check against the same log, and
 * refuses to exit green unless both checks pass.
 *
 * Usage:
 *   node scripts/ci/author-known-failures.mjs \
 *     --linux-log=<ci test log> --win32-log=<ci windows-test log> --run=<runId@sha>
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
// The gate's own parse, tally and fail-line accounting, imported rather than copied:
// authoring and --check must agree on what a complete log looks like, and --check
// enforces the same equation in CI that this script enforces before it writes a file.
import { vitestTally, collapsedFailLines, failLineAccounting } from '../known-failures.mjs';

const args = process.argv.slice(2);
const argValue = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const targets = [
  { platform: 'linux', log: argValue('linux-log'), out: 'tests/known-failures-linux.json' },
  { platform: 'win32', log: argValue('win32-log'), out: 'tests/known-failures-win32.json' },
];
const runRef = argValue('run');
if (!runRef || targets.some((t) => !t.log)) {
  console.error('Usage: author-known-failures.mjs --linux-log=<path> --win32-log=<path> --run=<runId@sha>');
  process.exit(2);
}

const run = (argv, input) =>
  execFileSync(process.execPath, argv, { encoding: 'utf8', input, maxBuffer: 256 * 1024 * 1024 });

for (const t of targets) {
  const text = readFileSync(t.log, 'utf8');
  if (!text.length) {
    console.error(`REFUSE: ${t.log} is empty -- an empty log parses as "0 failures" and would author a blank baseline.`);
    process.exit(1);
  }
  const tally = vitestTally(text);
  if (tally.tests === null || tally.files === null) {
    console.error(
      `REFUSE: ${t.log} carries no "Tests N failed" / "Test Files N failed" summary ` +
        `(tests=${tally.tests} files=${tally.files}), so its completeness cannot be checked.`
    );
    process.exit(1);
  }
  // Fail-closed anchors, the same two --check runs: a whole file whose output fell out
  // of the log is invisible to every line-based count, and a file that printed fewer
  // FAIL lines than its own row reports cannot be an accounting artifact.
  const accounting = failLineAccounting(text);
  if (accounting.countedFailures !== tally.tests) {
    console.error(
      `REFUSE: the per-file tallies of ${t.log} sum to ${accounting.countedFailures} failed test(s), ` +
        `but the run summary reports ${tally.tests} -- a whole file's output is missing.`
    );
    process.exit(1);
  }
  if (accounting.missing.length > 0) {
    console.error(`REFUSE: ${accounting.missing.length} file(s) in ${t.log} printed fewer FAIL lines than their own tally reports:`);
    for (const m of accounting.missing) {
      console.error(`  - ${m.file}: ${m.lines} FAIL line(s) against ${m.failed} failed test(s)`);
    }
    process.exit(1);
  }
  const json = run(
    ['scripts/known-failures.mjs', `--platform=${t.platform}`, `--source=run:${runRef}`],
    text,
  );
  const parsed = JSON.parse(json);
  if (!parsed.failures.length) {
    console.error(`REFUSE: generated an empty ${t.platform} baseline from ${t.log} (${text.length} chars). Check the log shape.`);
    process.exit(1);
  }
  // The extended equation, excess lines included, exactly as --check enforces it: a
  // hook that throws after its test already failed, or an attempt that failed and was
  // retried, prints a FAIL line vitest does not count as a failed test. Without the
  // excess term this tool refused a log the gate accepts (measured on a platform run:
  // 357 parsed entries against 356 failed tests + 2 collection errors, 1 excess line).
  const collapsed = collapsedFailLines(text);
  const rawFailLines = parsed.failures.length + collapsed;
  const expected = tally.tests + tally.collection + accounting.excessLines;
  if (rawFailLines !== expected) {
    console.error(
      `REFUSE: parsed ${parsed.failures.length} ${t.platform} failures (+${collapsed} duplicate line(s)) but vitest reported ` +
        `${tally.tests} failed tests + ${tally.collection} module-level collection errors ` +
        `+ ${accounting.excessLines} excess FAIL line(s) = ${expected}.`
    );
    process.exit(1);
  }
  if (parsed.metadata.fileCount !== tally.files) {
    console.error(`REFUSE: counted ${parsed.metadata.fileCount} ${t.platform} failing files but vitest reported ${tally.files}.`);
    process.exit(1);
  }
  console.log(
    `  vitest tally agrees: ${tally.tests} failed tests + ${tally.collection} collection errors in ${tally.files} files` +
      (accounting.excessLines ? ` (+${accounting.excessLines} excess FAIL line(s) accounted)` : '') +
      (collapsed ? ` (+${collapsed} duplicate line(s) collapsed)` : '')
  );
  writeFileSync(t.out, json);
  console.log(`${t.out}: ${parsed.metadata.testCount} failures / ${parsed.metadata.fileCount} files (source=${parsed.metadata.source})`);

  const check = run(['scripts/known-failures.mjs', '--check', `--baseline=${t.out}`], text);
  console.log(`  round-trip: ${check.split('\n').filter((l) => /Actual|Matched|All failures/.test(l)).join(' | ')}`);
}
console.log('both baselines authored and verified against their own logs');
