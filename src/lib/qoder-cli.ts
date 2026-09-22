import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { QODER_CN_CONFIG_DIR_NAME, resolveDefaultConfigDir } from '../utils/config-dir.js';

/**
 * Qoder ships two distributions whose executable and npm package names differ:
 * the international CLI (`qodercli`) and Qoder CN (`qoderclicn`). Hardcoding the
 * international pair breaks every launch path on CN - and makes `omq update`
 * install the wrong global package there - so both names come from here.
 */
export interface QoderCliFlavor {
  binary: string;
  npmPackage: string;
}

const FLAVORS: QoderCliFlavor[] = [
  { binary: 'qoderclicn', npmPackage: '@qodercn-ai/qoderclicn' },
  { binary: 'qodercli', npmPackage: '@qoder-ai/qodercli' },
];

const FALLBACK: QoderCliFlavor = FLAVORS[1];
/** Exported so any caller interpolating a binary name into a shell string can gate on it first. */
export const SAFE_BINARY_NAME = /^[A-Za-z0-9._-]+$/;

let cached: QoderCliFlavor | undefined;

function isOnPath(binary: string): boolean {
  const finder = process.platform === 'win32' ? 'where.exe' : 'which';
  return spawnSync(finder, [binary], {
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: 5000,
    windowsHide: true,
  }).status === 0;
}

function fromEnvOverride(): QoderCliFlavor | undefined {
  const binary = process.env.OMQ_QODER_CLI?.trim();
  if (!binary) return undefined;
  if (!SAFE_BINARY_NAME.test(binary)) {
    throw new Error(`Invalid OMQ_QODER_CLI binary name: ${binary}`);
  }
  const known = FLAVORS.find(f => f.binary === binary);
  const npmPackage = process.env.OMQ_QODER_CLI_NPM_PACKAGE?.trim() || known?.npmPackage;
  if (npmPackage && !/^[A-Za-z0-9@._~+/-]+$/.test(npmPackage)) {
    throw new Error(`Invalid OMQ_QODER_CLI_NPM_PACKAGE: ${npmPackage}`);
  }
  return { binary, npmPackage: npmPackage ?? FALLBACK.npmPackage };
}

export function qoderCli(): QoderCliFlavor {
  if (cached) return cached;
  const override = fromEnvOverride();
  if (override) {
    cached = override;
    return cached;
  }
  // A CN CLI installed outside PATH still must not resolve to the international
  // package, or `omq update` would install the wrong distribution globally.
  cached = FLAVORS.find(flavor => isOnPath(flavor.binary))
    ?? (basename(resolveDefaultConfigDir()) === QODER_CN_CONFIG_DIR_NAME ? FLAVORS[0] : FALLBACK);
  return cached;
}

export function qoderCliBinary(): string {
  return qoderCli().binary;
}

export function qoderCliNpmPackage(): string {
  return qoderCli().npmPackage;
}

/** Test seam: PATH contents and env overrides change between cases. */
export function clearQoderCliCache(): void {
  cached = undefined;
}
