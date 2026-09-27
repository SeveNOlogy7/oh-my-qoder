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
  const raw = readFileSync(t.log);
  if (!raw.length) {
    console.error(`REFUSE: ${t.log} is empty -- an empty log parses as "0 failures" and would author a blank baseline.`);
    process.exit(1);
  }
  const json = run(
    ['scripts/known-failures.mjs', `--platform=${t.platform}`, `--source=run:${runRef}`],
    raw.toString('utf8'),
  );
  const parsed = JSON.parse(json);
  if (!parsed.failures.length) {
    console.error(`REFUSE: generated an empty ${t.platform} baseline from ${t.log} (${raw.length} bytes). Check the log shape.`);
    process.exit(1);
  }
  writeFileSync(t.out, json);
  console.log(`${t.out}: ${parsed.metadata.testCount} failures / ${parsed.metadata.fileCount} files (source=${parsed.metadata.source})`);

  const check = run(['scripts/known-failures.mjs', '--check', `--baseline=${t.out}`], raw.toString('utf8'));
  console.log(`  round-trip: ${check.split('\n').filter((l) => /Actual|Matched|All failures/.test(l)).join(' | ')}`);
}
console.log('both baselines authored and verified against their own logs');
