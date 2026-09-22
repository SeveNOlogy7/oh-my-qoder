import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, normalize, parse, sep } from 'node:path';

export const QODER_INTL_CONFIG_DIR_NAME = '.qoder';
export const QODER_CN_CONFIG_DIR_NAME = '.qoder-cn';

function stripTrailingSep(p) {
  if (!p.endsWith(sep)) {
    return p;
  }

  return p === parse(p).root ? p : p.slice(0, -1);
}

// Mirrors src/utils/config-dir.ts. ~/.qoder also holds cross-product files on a
// CN machine, so only the CLI's own state marks the distribution.
export function resolveDefaultConfigDir(home = homedir()) {
  const cnRoot = join(home, QODER_CN_CONFIG_DIR_NAME);
  const cnHasState = existsSync(join(cnRoot, 'settings.json')) || existsSync(join(cnRoot, 'plugins'));
  return stripTrailingSep(normalize(join(home, cnHasState ? QODER_CN_CONFIG_DIR_NAME : QODER_INTL_CONFIG_DIR_NAME)));
}

export function getQoderConfigDir(env = process.env, home = homedir()) {
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

export function getQoderRootConfigFileName(configDir = getQoderConfigDir()) {
  return basename(normalize(configDir)) === QODER_CN_CONFIG_DIR_NAME
    ? `${QODER_CN_CONFIG_DIR_NAME}.json`
    : `${QODER_INTL_CONFIG_DIR_NAME}.json`;
}

export function getOmqConfigDir() {
  return join(getQoderConfigDir(), '.omq');
}

export function getUpdateCheckCachePath() {
  return join(getOmqConfigDir(), 'update-check.json');
}

// The HUD wrapper template still destructures the pre-rename symbol; this file is
// copied verbatim into <configDir>/hud/lib/, so without the alias the statusline
// throws "getClaudeConfigDir is not a function" on every render.
export const getClaudeConfigDir = getQoderConfigDir;
