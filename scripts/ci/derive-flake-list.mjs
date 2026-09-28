#!/usr/bin/env node
/**
 * Derive the win32 flake list from CI logs, so membership is evidence and not opinion.
 *
 * A test title qualifies only if it flipped between two adjacent runs in a way the
 * commit in between cannot explain: neither the entry's own file nor any file that
 * test drives may appear among the test-visible paths of that diff. Anything a test
 * can read is test-visible; CI-only scripts, docs and the baselines themselves are not.
 *
 * Usage (needs the captured logs of each run, see docs/KNOWN-FAILURES.md):
 *   node scripts/ci/derive-flake-list.mjs \
 *     --pair=<shaA>,<shaB>,<winLogA>,<winLogB> [--pair=...] \
 *     [--linux-pair=<shaA>,<shaB>,<logA>,<logB> ...] --write
 *
 * Linux pairs are reported and never written. They are the evidence that the two
 * gates are asymmetric on purpose, so the churn numbers quoted on the doc page come
 * out of this script instead of out of whoever last ran it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseVitestOutput } from '../known-failures.mjs';

const args = process.argv.slice(2);
const split = (flag) =>
  args.filter((a) => a.startsWith(`${flag}=`)).map((a) => a.slice(flag.length + 1).split(','));
const pairs = split('--pair');
const linuxPairs = split('--linux-pair');
const write = args.includes('--write');
const out = 'tests/known-failures-flaky-win32.json';

if (pairs.length < 2 || pairs.some((p) => p.length !== 4) || linuxPairs.some((p) => p.length !== 4)) {
  console.error('Usage: derive-flake-list.mjs --pair=<shaA>,<shaB>,<winA>,<winB> [--linux-pair=<shaA>,<shaB>,<logA>,<logB>] [--write]');
  console.error('At least two pairs: one flip is a data point, a list built from one run comparison is a guess.');
  process.exit(2);
}

const git = (a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const fileOf = (entry) => entry.split(' > ')[0].replace(/ \[.*\]$/, '');
// Everything outside this list can change what a test does. scripts/ci, docs, the
// baselines and .omq scratch cannot -- no test imports them.
const testVisible = (p) =>
  !/^scripts\/ci\//.test(p) && !/^docs\//.test(p) && !/^\.omq\//.test(p) && !/^tests\/known-failures-.*\.json$/.test(p);

const basenameOf = (p) => p.split('/').pop();
const textAt = new Map();
const sourceAt = (sha, path) => {
  const key = `${sha}:${path}`;
  if (!textAt.has(key)) {
    try {
      textAt.set(key, git(['show', `${sha}:${path}`]));
    } catch {
      textAt.set(key, '');
    }
  }
  return textAt.get(key);
};

// A flip is explained when the diff touches the test file itself OR a file that test
// drives -- the test names the script or module it spawns and imports, so that name is
// in its own text at the time of the run. Checking only the test file made every
// production fix look like a flake: the 13 titles that scripts/pre-tool-enforcer.mjs
// turned green would have been laundered into the allowlist.
const explainerOf = (testFile, visible, shaB) => {
  for (const changed of visible) {
    if (changed === testFile) return changed;
    const base = basenameOf(changed);
    if (base.includes('.') && sourceAt(shaB, testFile).includes(base)) return changed;
  }
  return null;
};

const rows = new Map();
const rowFor = (a, b) => {
  const key = `${a}->${b}`;
  if (!rows.has(key)) rows.set(key, { a, b, logs: {} });
  return rows.get(key);
};
for (const [a, b, la, lb] of pairs) rowFor(a, b).logs.win32 = [la, lb];
for (const [a, b, la, lb] of linuxPairs) rowFor(a, b).logs.linux = [la, lb];

const flaky = new Map();
const totals = {
  win32: { pairs: 0, flips: 0, unexplained: 0, unexplainedPerPair: [] },
  linux: { pairs: 0, flips: 0, unexplained: 0, unexplainedPerPair: [] },
};
for (const { a, b, logs } of rows.values()) {
  const changed = git(['diff', '--name-only', `${a}..${b}`]).split('\n').filter(Boolean);
  const visible = new Set(changed.filter(testVisible));
  const perPlatform = [];
  for (const [platform, [logA, logB]] of Object.entries(logs)) {
    const setA = new Set(parseVitestOutput(readFileSync(logA, 'utf8')));
    const setB = new Set(parseVitestOutput(readFileSync(logB, 'utf8')));
    const flips = [...setB].filter((x) => !setA.has(x)).concat([...setA].filter((x) => !setB.has(x)));
    const attributed = new Map();
    const qualified = flips.filter((x) => {
      const why = explainerOf(fileOf(x), visible, b);
      if (why) attributed.set(why, (attributed.get(why) ?? 0) + 1);
      return !why;
    });
    totals[platform].pairs++;
    totals[platform].flips += flips.length;
    totals[platform].unexplained += qualified.length;
    totals[platform].unexplainedPerPair.push(qualified.length);
    const causes = [...attributed]
      .sort((x, y) => y[1] - x[1])
      .map(([f, n]) => `${basenameOf(f)}=${n}`)
      .join(', ');
    perPlatform.push(
      `${platform}: ${qualified.length}/${flips.length} flips unexplained` +
        (causes ? ` (attributed: ${causes})` : '')
    );
    // Only win32 has an allowlist. Linux is gated by hand precisely because it does
    // not need one, so its flips are reported, never exempted.
    if (platform !== 'win32') continue;
    for (const t of qualified) {
      const e = flaky.get(t) ?? { entry: t, flips: 0, evidence: [] };
      e.flips++;
      e.evidence.push(`${a}->${b}`);
      flaky.set(t, e);
    }
  }
  console.log(
    `${a} -> ${b}: ${changed.length} changed, ${visible.size} test-visible | ${perPlatform.join(' | ')}`
  );
}

const entries = [...flaky.values()].sort((x, y) => y.flips - x.flips || x.entry.localeCompare(y.entry));
if (!entries.length) {
  console.error('REFUSE: no entry flipped unexplained in any pair -- either these runs are honest or the pairs are wrong.');
  process.exit(1);
}
const json = {
  metadata: {
    platform: 'win32',
    rule: 'a title enters this file only by scripts/ci/derive-flake-list.mjs: it must have flipped between two adjacent CI runs whose diff touches neither its own test file nor any file that test drives',
    pairs: pairs.length,
    entryCount: entries.length,
    // Measured churn, quoted by docs/KNOWN-FAILURES.md: the page prints these numbers
    // instead of a sentence somebody remembered from an earlier run.
    churn: totals,
  },
  entries,
};
console.log(`\n${entries.length} distinct win32 titles qualify across ${pairs.length} run pairs`);
console.log(
  `churn: win32 ${totals.win32.unexplained}/${totals.win32.flips} flips unexplained over ${totals.win32.pairs} pairs, ` +
    `linux ${totals.linux.unexplained}/${totals.linux.flips} over ${totals.linux.pairs}`
);
for (const e of entries) console.log(`  x${e.flips}  ${e.entry}`);
if (write) {
  writeFileSync(out, JSON.stringify(json, null, 2) + '\n');
  console.log(`wrote ${out}`);
} else {
  console.log(`\n(dry run; pass --write to update ${out})`);
}
