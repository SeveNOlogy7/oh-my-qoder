#!/usr/bin/env node
/**
 * One-command local install for developing this plugin from a checkout: build
 * every runtime artifact, register the plugin with Qoder CLI, then supply the
 * dependencies the plugin installer drops.
 *
 * `qodercli plugins install <dir>` copies the plugin tree but never
 * node_modules, and the bundle externals (@ast-grep/napi, better-sqlite3,
 * jsonc-parser) are native or un-bundlable, so the installed copy cannot start
 * without this step.
 */
import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getQoderConfigDir } from './lib/config-dir.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// A directory install registers as "<package name>@local": `local` is the slug the
// installer gives to directory sources, as opposed to `omq` for marketplace installs.
const PLUGIN_KEY = `${JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).name}@local`;

// npm and the Qoder CLI are .cmd shims on Windows, and spawning those requires
// shell mode, so command lines are assembled here rather than via execFile.
const quote = (value) => `"${value}"`;

// Quoting alone is not a defence: cmd.exe does not honour backslash-escaped
// quotes, and POSIX expands `$()` and backticks inside double quotes. Anything
// reaching the shell must therefore carry no metacharacters at all.
const SHELL_SAFE = /^[A-Za-z0-9:_.\\/\-~ ]+$/;

function assertShellSafe(label, value) {
  if (!SHELL_SAFE.test(value)) {
    throw new Error(`${label} contains characters that are unsafe in a shell command line: ${value}`);
  }
  return value;
}

function run(command, opts = {}) {
  console.log(`\n$ ${command}`);
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }) ?? '';
}

function findQoderCli() {
  // OMQ_QODER_CLI_PATH is a full executable path; src/lib/qoder-cli.ts reserves
  // OMQ_QODER_CLI for a bare binary name, so the two must not share a variable.
  const override = process.env.OMQ_QODER_CLI_PATH?.trim();
  if (override) return assertShellSafe('OMQ_QODER_CLI_PATH', override);

  const probe = process.platform === 'win32' ? 'where.exe' : 'which';
  for (const name of ['qoderclicn', 'qodercli']) {
    try {
      const hits = execFileSync(probe, [name], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const hit = hits.find((entry) => /\.(cmd|exe|bat)$/i.test(entry)) ?? hits[0];
      if (hit) return assertShellSafe(`resolved ${name} path`, hit);
    } catch {
      // Not on PATH - try the next candidate name.
    }
  }
  throw new Error(
    'qoderclicn/qodercli not found on PATH. Install the Qoder CLI, or set OMQ_QODER_CLI_PATH to its executable.',
  );
}

function readInstallPath(configDir) {
  const statePath = join(configDir, 'plugins', 'installed_plugins_v2.json');
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Cannot read ${statePath}. Is QODER_CONFIG_DIR pointing at the config root this IDE uses? (${error.message})`,
    );
  }
  const entry = state.plugins?.[PLUGIN_KEY]?.find((candidate) => candidate.scope === 'user');
  if (!entry?.installPath) {
    throw new Error(`Plugin registry has no user-scope "${PLUGIN_KEY}" entry after install.`);
  }
  return entry.installPath;
}

const configDir = getQoderConfigDir();
const cli = findQoderCli();
const safeRepoRoot = assertShellSafe('plugin source path', repoRoot);
console.log(`config root: ${configDir}\nqoder cli:   ${cli}`);

run('npm install --no-audit --no-fund', { cwd: safeRepoRoot });
run('npm run build', { cwd: safeRepoRoot });
run(`${quote(cli)} plugins install ${quote(safeRepoRoot)}`);

const installPath = readInstallPath(configDir);
console.log(`installed at: ${installPath}`);

const destModules = join(installPath, 'node_modules');
// Measured from the shipped bundles: these are the packages the artifacts still
// require at runtime. `commander` and `jsonc-parser` are inlined into the bundles,
// so listing them here made the check pass (or fail) for the wrong reasons.
const requiredExternals = ['ajv', 'ajv-formats', '@ast-grep/napi', 'better-sqlite3'];
const missing = requiredExternals.filter((name) => !existsSync(join(destModules, name)));

if (missing.length === 0) {
  console.log('runtime deps already present, skipping copy');
} else {
  console.log(`copying runtime deps (missing: ${missing.join(', ')})...`);
  try {
    cpSync(join(repoRoot, 'node_modules'), destModules, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to copy node_modules into the installed plugin: ${error.message}\n`
      + 'A running Qoder session can hold a native .node file open - close it and rerun.',
    );
  }
}

writeFileSync(
  join(installPath, '.omq-local-install.json'),
  `${JSON.stringify({ installedVia: 'scripts/install-local.mjs', configDir }, null, 2)}\n`,
);

for (const required of ['bridge/cli.cjs', 'bridge/team-mcp.cjs', 'dist/hooks/skill-bridge.cjs', 'bin/omq.cmd']) {
  if (!existsSync(join(installPath, required))) {
    throw new Error(`${required} missing in the installed copy - build or packaging is incomplete.`);
  }
}
console.log('\ndone. Restart Qoder (or /plugins reload) and run: omq doctor conflicts');
