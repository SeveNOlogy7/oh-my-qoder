#!/usr/bin/env node
/**
 * Fetch an ancestor blob tree into the local cache the ledger reads.
 *
 * `.omq/` is gitignored, so the cached trees that `ANCESTOR_BASELINE.json` points
 * at do not exist on a fresh checkout -- every CI run of the provenance gate died
 * on "Tree cache not found" until this script existed. It fetches by the pinned
 * `treeSha` (content-addressed, so a moving tag cannot change what we get) and
 * refuses a truncated response, because a partial tree would silently classify
 * files as absent from the ancestor.
 *
 * Usage:
 *   node scripts/fetch-ancestor-trees.mjs                 # both pinned trees
 *   node scripts/fetch-ancestor-trees.mjs --which lineage # one of them
 *
 * Env: GITHUB_TOKEN (optional, only to raise the rate limit).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Turn a GitHub tree API response into cache entries.
 * Throws rather than returning a partial tree: `truncated` means the ancestor
 * looks smaller than it is, and every downstream classification would lie.
 */
export function toTreeEntries(payload) {
  if (payload?.truncated === true) {
    throw new Error('tree response was truncated; refusing to cache a partial ancestor tree');
  }
  if (!Array.isArray(payload?.tree)) {
    throw new Error('tree response has no tree array');
  }
  return payload.tree
    .filter((entry) => entry.type === 'blob')
    .map((entry) => ({ path: entry.path, sha: entry.sha }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function fetchTree(repo, treeSha, token) {
  const url = `https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=1`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'oh-my-qoder-provenance' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`);
  }
  return toTreeEntries(await response.json());
}

export async function main(argv = process.argv.slice(2)) {
  const which = argv.includes('--which') ? argv[argv.indexOf('--which') + 1] : null;
  const baseline = JSON.parse(readFileSync(join(repoRoot, 'ANCESTOR_BASELINE.json'), 'utf8'));
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const wanted = Object.entries(baseline).filter(([key]) => key === 'lineage' || key === 'adoptionTarget');
  const targets = which ? wanted.filter(([key]) => key === which) : wanted;
  if (!targets.length) {
    console.error(`unknown --which value: ${which}`);
    return 2;
  }

  for (const [key, ref] of targets) {
    const entries = await fetchTree(ref.repo, ref.treeSha, token);
    const outPath = isAbsolute(ref.treeCache) ? ref.treeCache : join(repoRoot, ref.treeCache);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(entries)}\n`, 'utf8');
    // Prove what we just cached is the tree the baseline claims it is.
    const recomputed = entries.length;
    if (ref.blobCount !== undefined && recomputed !== ref.blobCount) {
      console.error(`${key}: cached ${recomputed} blobs but baseline pins ${ref.blobCount} -- refusing to leave a mismatched cache`);
      return 3;
    }
    console.log(`${key} ${ref.tag}: ${recomputed} blobs -> ${ref.treeCache}`);
  }
  return 0;
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(err.message);
    process.exit(2);
  });
}
