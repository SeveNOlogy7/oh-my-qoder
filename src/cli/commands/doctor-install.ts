/**
 * `omq doctor install` - is this installed copy actually runnable?
 *
 * A plugin cache directory can be complete on disk and still not work: Qoder's
 * installer copies the tree but never `node_modules`, and the bundles keep
 * `ajv`/`better-sqlite3`/`@ast-grep/napi` as runtime externals. Some of those are
 * required eagerly by generated code (the copy fails at load), others are loaded
 * on demand (the tools that need them say so at call time). Reporting "installed"
 * without distinguishing the two is what made a broken install look healthy.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { getPluginCacheBase } from '../../utils/paths.js';
import { validatePluginCachePayload } from '../../installer/index.js';

/** Required by generated code inside the bundles - absent => runtime failure. */
const REQUIRED_MODULES = ['ajv', 'ajv-formats'];
/** Loaded on demand - absent => the capabilities listed below degrade. */
const DEGRADING_MODULES = ['@ast-grep/napi', 'better-sqlite3'];

const DEGRADED_CAPABILITIES: Record<string, string> = {
  '@ast-grep/napi': 'ast_grep_search, ast_grep_replace',
  'better-sqlite3': 'job-state DB, swarm/team job persistence',
};

export interface ModuleProbe {
  name: string;
  status: 'ok' | 'missing' | 'load-failed';
  error?: string;
  degraded?: string;
}

export interface InstallReport {
  root: string;
  rootSource: 'flag-or-env' | 'plugin-cache' | 'unresolved';
  payload: { valid: boolean; errors: string[] };
  modules: ModuleProbe[];
  npmRootGlobal: string | null;
  nodePathIncludesNpmRoot: boolean;
}

/** Resolve `name` from `root` and then load it: resolving and loading differ for natives. */
export function probeModule(root: string, name: string): ModuleProbe {
  const req = createRequire(join(root, 'noop.js'));
  try {
    req(name);
    return { name, status: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = /Cannot find (?:module|package)|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/.test(message);
    return {
      name,
      status: missing ? 'missing' : 'load-failed',
      error: message.split('\n')[0].slice(0, 200),
      ...(missing && DEGRADED_CAPABILITIES[name] ? { degraded: DEGRADED_CAPABILITIES[name] } : {}),
    };
  }
}

function resolveRoot(flagged?: string): { root: string; source: InstallReport['rootSource'] } {
  const envRoot = process.env.OMQ_PLUGIN_ROOT || process.env.QODER_PLUGIN_ROOT;
  if (flagged) return { root: flagged, source: 'flag-or-env' };
  if (envRoot && existsSync(envRoot)) return { root: envRoot, source: 'flag-or-env' };
  const cacheBase = getPluginCacheBase();
  if (existsSync(cacheBase)) {
    let versions: string[] = [];
    try {
      versions = readdirSync(cacheBase).filter(name => /^\d/.test(name)).sort();
    } catch {
      versions = [];
    }
    if (versions.length > 0) return { root: join(cacheBase, versions[versions.length - 1]), source: 'plugin-cache' };
  }
  return { root: cacheBase, source: 'unresolved' };
}

function globalNpmRoot(): string | null {
  try {
    return execSync('npm root -g', { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

export function collectInstallReport(flagged?: string): InstallReport {
  const { root, source } = resolveRoot(flagged);
  const payload = existsSync(root)
    ? validatePluginCachePayload(root)
    : { valid: false, errors: [`plugin root does not exist: ${root}`] };
  const npmRootGlobal = globalNpmRoot();
  const nodePath = process.env.NODE_PATH ?? '';

  return {
    root,
    rootSource: source,
    payload,
    modules: [
      ...REQUIRED_MODULES.map(name => probeModule(root, name)),
      ...DEGRADING_MODULES.map(name => probeModule(root, name)),
    ],
    npmRootGlobal,
    nodePathIncludesNpmRoot: Boolean(npmRootGlobal && nodePath.split(/[:;]/).includes(npmRootGlobal)),
  };
}

export async function doctorInstallCommand(options: { json?: boolean; pluginDir?: string } = {}): Promise<number> {
  const report = collectInstallReport(options.pluginDir);
  const required = report.modules.filter(m => REQUIRED_MODULES.includes(m.name));
  const optional = report.modules.filter(m => DEGRADING_MODULES.includes(m.name));
  const ok = report.payload.valid && required.every(m => m.status === 'ok');

  if (options.json) {
    console.log(JSON.stringify({ ...report, ok }, null, 2));
    return ok ? 0 : 1;
  }

  console.log(`plugin root: ${report.root} (${report.rootSource})`);
  console.log(`payload:     ${report.payload.valid ? 'complete' : 'INCOMPLETE'}`);
  for (const error of report.payload.errors) {
    console.log(`  - ${error}`);
  }
  console.log(`npm root -g: ${report.npmRootGlobal ?? '(unavailable)'}${report.nodePathIncludesNpmRoot ? ' (on NODE_PATH)' : ''}`);
  console.log('modules:');
  for (const module of [...required, ...optional]) {
    const kind = REQUIRED_MODULES.includes(module.name) ? 'required' : 'optional';
    console.log(`  ${module.status === 'ok' ? 'OK  ' : 'FAIL'} ${module.name} [${kind}] ${module.status}${module.error ? ` :: ${module.error}` : ''}`);
  }
  for (const module of optional.filter(m => m.status !== 'ok')) {
    console.log(`  degraded: ${module.degraded ?? module.name}`);
  }
  if (ok) {
    console.log('install check: OK');
  } else {
    console.log('install check: FAILED - reinstall with "qoderclicn plugins install <dir>" from a built checkout, or run "npm run install:local" in the repo.');
  }
  return ok ? 0 : 1;
}
