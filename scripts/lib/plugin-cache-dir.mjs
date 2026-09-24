#!/usr/bin/env node
/**
 * Resolve where the installed oh-my-qoder plugin cache lives.
 *
 * The marketplace segment varies: an `omq` marketplace install lands in
 * `plugins/cache/omq/oh-my-qoder`, while `qoderclicn plugins install <dir>`
 * lands in `plugins/cache/local/oh-my-qoder`. Anything that assumes one of them
 * reports the other as missing, so scan instead.
 *
 * Mirrors resolvePluginCacheBase() in src/utils/paths.ts; scripts/*.mjs cannot
 * import from dist/, so the two must be changed together. Nothing enforces that
 * automatically - src/__tests__/paths-consistency.test.ts only greps the HUD
 * template for path fragments.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const MARKETPLACE_SLUG = 'omq';
export const PACKAGE_NAME = 'oh-my-qoder';

const VERSION_DIR = /^\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.-]+)?$/;

function compareVersions(a, b) {
  const [coreA, preA] = a.split(/[-+]/);
  const [coreB, preB] = b.split(/[-+]/);
  const partsA = coreA.split('.').map(Number);
  const partsB = coreB.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (preA && !preB) return -1;
  if (!preA && preB) return 1;
  return 0;
}

export function listPluginCacheEntries(configDir) {
  const cacheParent = join(configDir, 'plugins', 'cache');
  const entries = [];
  let slugs;
  try {
    slugs = readdirSync(cacheParent).sort();
  } catch {
    return entries;
  }

  for (const slug of slugs) {
    const base = join(cacheParent, slug, PACKAGE_NAME);
    let versions;
    try {
      versions = readdirSync(base).filter((name) => {
        if (!VERSION_DIR.test(name)) return false;
        try {
          return statSync(join(base, name)).isDirectory();
        } catch {
          return false;
        }
      }).sort(compareVersions);
    } catch {
      continue;
    }
    if (versions.length === 0) continue;
    entries.push({ base, latest: versions[versions.length - 1], versions });
  }
  return entries;
}

export function resolvePluginCacheBase(configDir) {
  const fallback = join(configDir, 'plugins', 'cache', MARKETPLACE_SLUG, PACKAGE_NAME);
  const entries = listPluginCacheEntries(configDir);
  if (entries.length === 0) return fallback;
  entries.sort((a, b) => {
    const byVersion = compareVersions(a.latest, b.latest);
    if (byVersion !== 0) return byVersion;
    const aCanonical = a.base.endsWith(join(MARKETPLACE_SLUG, PACKAGE_NAME)) ? 1 : 0;
    const bCanonical = b.base.endsWith(join(MARKETPLACE_SLUG, PACKAGE_NAME)) ? 1 : 0;
    return aCanonical - bCanonical;
  });
  return entries[entries.length - 1].base;
}

if (process.argv[1] && process.argv[1].endsWith('plugin-cache-dir.mjs')) {
  const { getQoderConfigDir } = await import('./config-dir.mjs');
  const configDir = process.argv[3] === '--config-dir'
    ? process.argv[4]
    : getQoderConfigDir();
  if (process.argv[2] === '--versions') {
    const entries = listPluginCacheEntries(configDir);
    for (const e of entries) console.log(`${e.base}\t${e.versions.join(', ')}`);
    if (entries.length === 0) console.log('0 versions');
  } else {
    console.log(resolvePluginCacheBase(configDir));
  }
}
