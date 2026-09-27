#!/usr/bin/env node
/**
 * Derive the win32 flake list from CI logs, so membership is evidence and not opinion.
 *
 * A test title qualifies only if it flipped between two adjacent runs in a way the
 * commit in between cannot explain: the entry's own file must not appear among the
 * test-visible paths of that diff. Anything a test can read is test-visible; CI-only
 * scripts, docs and the baselines themselves are not.
 *
 * Usage (needs the captured logs of each run, see docs/KNOWN-FAILURES.md):
 *   node scripts/ci/derive-flake-list.mjs \
 *     --pair=<shaA>,<shaB>,<logA>,<logB> [--pair=...] --write
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseVitestOutput } from '../known-failures.mjs';

const args = process.argv.slice(2);
const pairs = args.filter((a) => a.startsWith('--pair=')).map((a) => a.slice(7).split(','));
const write = args.includes('--write');
const out = 'tests/known-failures-flaky-win32.json';

if (pairs.length < 2 || pairs.some((p) => p.length !== 4)) {
  console.error('Usage: derive-flake-list.mjs --pair=<shaA>,<shaB>,<logA>,<logB> [--pair=...] [--write]');
  console.error('At least two pairs: one flip is a data point, a list built from one run comparison is a guess.');
  process.exit(2);
}

const git = (a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const fileOf = (entry) => entry.split(' > ')[0].replace(/ \[.*\]$/, '');
// Everything outside this list can change what a test does. scripts/ci, docs, the
// baselines and .omq scratch cannot -- no test imports them.
const testVisible = (p) =>
  !/^scripts\/ci\//.test(p) && !/^docs\//.test(p) && !/^\.omq\//.test(p) && !/^tests\/known-failures-.*\.json$/.test(p);

const flaky = new Map();
for (const [a, b, logA, logB] of pairs) {
  const changed = git(['diff', '--name-only', `${a}..${b}`]).split('\n').filter(Boolean);
  const visible = new Set(changed.filter(testVisible));
  const setA = new Set(parseVitestOutput(readFileSync(logA, 'utf8')));
  const setB = new Set(parseVitestOutput(readFileSync(logB, 'utf8')));
  const flips = [...setB].filter((x) => !setA.has(x)).concat([...setA].filter((x) => !setB.has(x)));
  const qualified = flips.filter((x) => !visible.has(fileOf(x)));
  console.log(
    `${a} -> ${b}: ${changed.length} changed, ${visible.size} test-visible, ` +
      `${flips.length} flips, ${qualified.length} unexplainable`
  );
  for (const t of qualified) {
    const e = flaky.get(t) ?? { entry: t, flips: 0, evidence: [] };
    e.flips++;
    e.evidence.push(`${a}->${b}`);
    flaky.set(t, e);
  }
}

const entries = [...flaky.values()].sort((x, y) => y.flips - x.flips || x.entry.localeCompare(y.entry));
if (!entries.length) {
  console.error('REFUSE: no entry flipped unexplained in any pair -- either these runs are honest or the pairs are wrong.');
  process.exit(1);
}
const json = {
  metadata: {
    platform: 'win32',
    rule: 'a title enters this file only by scripts/ci/derive-flake-list.mjs: it must have flipped between two adjacent CI runs whose diff does not contain its own file',
    pairs: pairs.length,
    entryCount: entries.length,
  },
  entries,
};
console.log(`\n${entries.length} distinct win32 titles qualify across ${pairs.length} run pairs`);
for (const e of entries) console.log(`  x${e.flips}  ${e.entry}`);
if (write) {
  writeFileSync(out, JSON.stringify(json, null, 2) + '\n');
  console.log(`wrote ${out}`);
} else {
  console.log(`\n(dry run; pass --write to update ${out})`);
}
