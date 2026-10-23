import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, normalize, parse, sep } from 'node:path';

// Mirror of scripts/lib/config-dir.mjs and src/utils/config-dir.ts. Templates
// ship standalone, so this copy cannot import the canonical one -- keep the
// three in step (hook-templates.test.ts pins this mirror's behaviour).
export const QODER_INTL_CONFIG_DIR_NAME = '.qoder';
export const QODER_CN_CONFIG_DIR_NAME = '.qoder-cn';

function stripTrailingSep(p) {
  if (!p.endsWith(sep)) {
    return p;
  }

  return p === parse(p).root ? p : p.slice(0, -1);
}

// ~/.qoder also holds cross-product files on a CN machine, so only the CLI's own
// state marks the distribution.
export function resolveDefaultConfigDir(home = homedir()) {
  const cnRoot = join(home, QODER_CN_CONFIG_DIR_NAME);
  const cnHasState = existsSync(join(cnRoot, 'settings.json')) || existsSync(join(cnRoot, 'plugins'));
  const chosen = cnHasState ? QODER_CN_CONFIG_DIR_NAME : QODER_INTL_CONFIG_DIR_NAME;
  return stripTrailingSep(normalize(join(home, chosen)));
}

// Declared under the ancestor spelling as a function: the standalone-hook reconciliation contract
// pins the copied payload to contain `export function getClaudeConfigDir()`, and the fork spelling
// below aliases the SAME reference so config-dir-mirror-parity's .toBe identity check holds.
export function getClaudeConfigDir(env = process.env, home = homedir()) {
  const configured = (env.QODER_CONFIG_DIR ?? '').trim() || (env.QODERCN_CONFIG_DIR ?? '').trim();

  if (!configured) {
    return resolveDefaultConfigDir(home);
  }

  if (configured === '~') {
    return stripTrailingSep(normalize(home));
  }

  if (configured.startsWith('~/') || configured.startsWith('~\\')) {
    return stripTrailingSep(normalize(join(home, configured.slice(2))));
  }

  return stripTrailingSep(normalize(configured));
}

// The HUD wrapper template still destructures the pre-rename symbol; this alias keeps both
// spellings pointing at one function object.
export const getQoderConfigDir = getClaudeConfigDir;

export function getOmqConfigDir() {
  return join(getQoderConfigDir(), '.omq');
}

export function getUpdateCheckCachePath() {
  return join(getOmqConfigDir(), 'update-check.json');
}
