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

/** A FAIL line with a bracketed file suffix is a module-level collection error:
 *  the file counts as failed but contributes no test to vitest's Tests tally. */
const COLLECTION_FAIL_RE = /^FAIL\s+\S+\s+\[\s*\S+\s*\]$/;

/**
 * vitest's own tally, so a truncated log cannot pass as a complete one.
 * Authoring and --check consume the same buffer, so the round-trip only proves
 * the parse is self-consistent; this proves it saw the whole run.
 *
 * CI lines carry a `job<TAB>step<TAB>timestamp ` prefix and literal `^[[`
 * colour codes, both of which have to go before the summary lines match -- the
 * same two strips scripts/known-failures.mjs applies when it parses.
 */
function vitestTally(logText) {
  const lines = logText
    .replace(/\^\[\[/g, '\x1b[')
    .split('\n')
    .map((l) => {
      const p = /^[^\t]+\t[^\t]+\t\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z /.exec(l);
      return (p ? l.slice(p[0].length) : l).replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    });
  const summary = (re) => {
    const hit = lines.find((l) => re.test(l.trim()));
    return hit ? Number(re.exec(hit.trim())[1]) : null;
  };
  return {
    tests: summary(/^Tests\s+(\d+) failed\b/),
    files: summary(/^Test Files\s+(\d+) failed\b/),
    collection: lines.filter((l) => COLLECTION_FAIL_RE.test(l.trim())).length,
  };
}

for (const t of targets) {
  const raw = readFileSync(t.log);
  if (!raw.length) {
    console.error(`REFUSE: ${t.log} is empty -- an empty log parses as "0 failures" and would author a blank baseline.`);
    process.exit(1);
  }
  const text = raw.toString('utf8');
  const tally = vitestTally(text);
  if (tally.tests === null) {
    console.error(`REFUSE: ${t.log} has no "Tests  N failed" summary line, so its completeness cannot be checked.`);
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
  if (parsed.failures.length !== tally.tests + tally.collection) {
    console.error(
      `REFUSE: parsed ${parsed.failures.length} ${t.platform} failures but vitest reported ` +
        `${tally.tests} failed tests + ${tally.collection} module-level collection errors ` +
        `= ${tally.tests + tally.collection}.`
    );
    process.exit(1);
  }
  if (parsed.metadata.fileCount !== tally.files) {
    console.error(`REFUSE: counted ${parsed.metadata.fileCount} ${t.platform} failing files but vitest reported ${tally.files}.`);
    process.exit(1);
  }
  console.log(
    `  vitest tally agrees: ${tally.tests} failed tests + ${tally.collection} collection errors in ${tally.files} files`
  );
  writeFileSync(t.out, json);
  console.log(`${t.out}: ${parsed.metadata.testCount} failures / ${parsed.metadata.fileCount} files (source=${parsed.metadata.source})`);

  const check = run(['scripts/known-failures.mjs', '--check', `--baseline=${t.out}`], raw.toString('utf8'));
  console.log(`  round-trip: ${check.split('\n').filter((l) => /Actual|Matched|All failures/.test(l)).join(' | ')}`);
}
console.log('both baselines authored and verified against their own logs');
