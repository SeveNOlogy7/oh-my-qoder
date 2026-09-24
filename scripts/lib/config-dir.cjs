const { existsSync } = require('node:fs');
const { homedir } = require('node:os');
const { basename, join, normalize, parse, sep } = require('node:path');

const QODER_INTL_CONFIG_DIR_NAME = '.qoder';
const QODER_CN_CONFIG_DIR_NAME = '.qoder-cn';

function stripTrailingSep(p) {
  if (!p.endsWith(sep)) {
    return p;
  }

  return p === parse(p).root ? p : p.slice(0, -1);
}

// Mirrors src/utils/config-dir.ts. ~/.qoder also holds cross-product files on a
// CN machine, so only the CLI's own state marks the distribution.
function resolveDefaultConfigDir(home = homedir()) {
  const cnRoot = join(home, QODER_CN_CONFIG_DIR_NAME);
  const cnHasState = existsSync(join(cnRoot, 'settings.json')) || existsSync(join(cnRoot, 'plugins'));
  return stripTrailingSep(normalize(join(home, cnHasState ? QODER_CN_CONFIG_DIR_NAME : QODER_INTL_CONFIG_DIR_NAME)));
}

function getQoderConfigDir(env = process.env, home = homedir()) {
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

function getQoderRootConfigFileName(configDir = getQoderConfigDir()) {
  return basename(normalize(configDir)) === QODER_CN_CONFIG_DIR_NAME
    ? `${QODER_CN_CONFIG_DIR_NAME}.json`
    : `${QODER_INTL_CONFIG_DIR_NAME}.json`;
}

function getOmqConfigDir() {
  return join(getQoderConfigDir(), '.omq');
}

function getUpdateCheckCachePath() {
  return join(getOmqConfigDir(), 'update-check.json');
}

module.exports = {
  getQoderConfigDir,
  resolveDefaultConfigDir,
  getQoderRootConfigFileName,
  getOmqConfigDir,
  getUpdateCheckCachePath,
};
