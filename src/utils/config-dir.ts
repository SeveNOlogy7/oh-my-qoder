/**
 * Qoder CLI Configuration Directory Resolution
 *
 * Resolves the active Qoder CLI configuration directory, honouring
 * QODER_CONFIG_DIR / QODERCN_CONFIG_DIR (absolute path, or ~-prefixed).
 * When neither is set — a plain terminal, not a CLI-launched session — the
 * distribution is inferred from which root actually holds state, because the
 * CN build keeps its data in ~/.qoder-cn while the international one uses
 * ~/.qoder. Trailing separators are stripped; filesystem roots are preserved.
 *
 * Multi-surface mirrors (keep in sync):
 *   scripts/lib/config-dir.mjs   — ESM hook/HUD runtime
 *   scripts/lib/config-dir.cjs   — CJS bridge runtime
 *   scripts/lib/config-dir.sh    — POSIX shell runtime
 */

import { existsSync } from 'fs';
import { basename, join, normalize, parse, sep } from 'path';
import { homedir } from 'os';

export const QODER_INTL_CONFIG_DIR_NAME = '.qoder';
export const QODER_CN_CONFIG_DIR_NAME = '.qoder-cn';

/**
 * Strip a single trailing path separator (preserve filesystem root).
 * @internal Shared with scripts/lib/config-dir.{mjs,cjs,sh} — keep in sync.
 */
function stripTrailingSep(p: string): string {
  if (!p.endsWith(sep)) {
    return p;
  }
  return p === parse(p).root ? p : p.slice(0, -1);
}

/**
 * Pick the default config root when no environment override exists.
 *
 * ~/.qoder also holds cross-product files on a CN machine, so a bare directory
 * is not evidence; only the CLI's own state files mark the distribution.
 */
export function resolveDefaultConfigDir(home: string = homedir()): string {
  const cnRoot = join(home, QODER_CN_CONFIG_DIR_NAME);
  const cnHasState = existsSync(join(cnRoot, 'settings.json')) || existsSync(join(cnRoot, 'plugins'));
  return stripTrailingSep(normalize(join(home, cnHasState ? QODER_CN_CONFIG_DIR_NAME : QODER_INTL_CONFIG_DIR_NAME)));
}

/** @internal Probe results are cached per home so one process never splits. */
let inferredDefault: { home: string; dir: string } | undefined;

/**
 * The inferred default config root, probed at most once per process.
 *
 * The CN/international choice reads filesystem state, so re-probing lets two
 * callers in the same process disagree as soon as anything writes into a root -
 * typically a module constant captured at import versus a later call. Use
 * resolveDefaultConfigDir() directly to force a fresh probe. The script mirrors
 * need no cache: each resolves the root once per one-shot process.
 */
export function getInferredConfigDir(home: string = homedir()): string {
  if (!inferredDefault || inferredDefault.home !== home) {
    inferredDefault = { home, dir: resolveDefaultConfigDir(home) };
  }
  return inferredDefault.dir;
}

/**
 * Resolve the Qoder CLI configuration directory.
 *
 * Honours QODER_CONFIG_DIR, then QODERCN_CONFIG_DIR (absolute path, or
 * ~-prefixed), falling back to the inferred default. Trailing separators are
 * stripped; filesystem roots are preserved.
 */
export function getQoderConfigDir(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string {
  const configured = (env.QODER_CONFIG_DIR ?? '').trim() || (env.QODERCN_CONFIG_DIR ?? '').trim();

  if (!configured) {
    return getInferredConfigDir(home);
  }

  if (configured === '~') {
    return stripTrailingSep(normalize(home));
  }

  if (configured.startsWith('~/') || configured.startsWith('~\\')) {
    return stripTrailingSep(normalize(join(home, configured.slice(2))));
  }

  return stripTrailingSep(normalize(configured));
}

/**
 * Name of the root-level Qoder config JSON that sits beside the config dir.
 * The CN distribution uses `~/.qoder-cn.json`, the international one
 * `~/.qoder.json`; a custom config dir keeps the international name.
 */
export function getQoderRootConfigFileName(
  configDir: string = getQoderConfigDir(),
): string {
  return basename(normalize(configDir)) === QODER_CN_CONFIG_DIR_NAME
    ? `${QODER_CN_CONFIG_DIR_NAME}.json`
    : `${QODER_INTL_CONFIG_DIR_NAME}.json`;
}

/**
 * Compare a path against the inferred default config root. Both sides are
 * normalized so a trailing separator or separator style never changes the
 * answer - callers embed this in generated shell commands.
 */
export function isDefaultQoderConfigDir(configDir: string, home: string = homedir()): boolean {
  const strip = (p: string) => stripTrailingSep(normalize(p)).replace(/\\/g, '/');
  return strip(configDir) === strip(resolveDefaultConfigDir(home));
}

/**
 * The default config root expressed for `${QODER_CONFIG_DIR:-...}` shell
 * expansions inside generated hook and statusline commands.
 *
 * `$HOME` is deliberately left unexpanded: these strings are persisted into
 * settings.json and must keep resolving if the home directory moves, so only
 * the distribution-specific directory name is substituted.
 */
export function getDefaultConfigDirShellPath(home: string = homedir()): string {
  const cn = normalize(resolveDefaultConfigDir(home)) === normalize(join(home, QODER_CN_CONFIG_DIR_NAME));
  return `$HOME/${cn ? QODER_CN_CONFIG_DIR_NAME : QODER_INTL_CONFIG_DIR_NAME}`;
}

/**
 * Resolve the OMQ global configuration/cache directory under the active Claude
 * config dir. This keeps hook/updater/HUD caches aligned with QODER_CONFIG_DIR
 * instead of mixing in ~/.omq.
 */
export function getOmqConfigDir(): string {
  return join(getQoderConfigDir(), '.omq');
}

/** Resolve the canonical update-check cache file path. */
export function getUpdateCheckCachePath(): string {
  return join(getOmqConfigDir(), 'update-check.json');
}

/**
 * Ancestor-era name. Vendored ancestor files call `getClaudeConfigDir`; OMQ
 * resolves the CN vs international root itself, so this is a thin alias rather
 * than a second implementation that could drift.
 */
export function getClaudeConfigDir(): string {
  return getQoderConfigDir();
}
