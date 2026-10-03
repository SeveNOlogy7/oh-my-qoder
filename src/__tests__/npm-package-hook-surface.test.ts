import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MCP_JSON_PATH,
  PACKAGE_ROOT,
  PLUGIN_JSON_PATH,
  listSourceControlledPackageFiles,
  readPluginMcpServers,
  referencesRootMcpConfig,
  referencesStandardHooksManifest,
  type PluginJson,
} from './npm-package-surface-helpers.js';

describe('npm package hook surface regression', () => {
  it('builds the coordinator for packaging without mutating ordinary test entrypoints', () => {
    const packageJson = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'),
    ) as {
      files?: string[];
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.build).toMatch(
      /npm run compose-docs && npm run generate:prompt-projections && npm run build:claude-md-coordinator/,
    );
    expect(
      packageJson.scripts?.build?.indexOf('npm run compose-docs'),
    ).toBeLessThan(
      packageJson.scripts?.build?.indexOf('npm run generate:prompt-projections') ?? -1,
    );
    expect(
      packageJson.scripts?.build?.indexOf('npm run generate:prompt-projections'),
    ).toBeLessThan(
      packageJson.scripts?.build?.indexOf('npm run build:claude-md-coordinator') ?? -1,
    );
    // Guard the contamination, not a fixed script list: this fork ships `test` and
    // `test:run` only (b37141e and HEAD agree), while the ancestor's package.json also has
    // test:ui/test:coverage. Enumerating the ancestor's four names asserted against undefined
    // values, which vitest rejects rather than passing.
    const testEntrypoints = Object.entries(packageJson.scripts ?? {})
      .filter(([name]) => name === 'test' || name.startsWith('test:'));
    expect(testEntrypoints.map(([name]) => name).sort()).toEqual(['test', 'test:run']);
    for (const [name, script] of testEntrypoints) {
      expect(script, name).not.toContain(
        'build:claude-md-coordinator',
      );
    }
    expect(packageJson.scripts?.prepack).toBe('npm run build');
    expect(packageJson.scripts?.prepublishOnly).toBe('npm run build');
    expect(packageJson.files).toEqual(
      expect.arrayContaining([
        '.qoder-plugin',
        '.mcp.json',
        'hooks',
        'scripts',
        'templates',
      ]),
    );
  });

  it('keeps the source-controlled plugin and MCP manifests wired to exact standard entrypoints', () => {
    expect(existsSync(PLUGIN_JSON_PATH)).toBe(true);
    expect(existsSync(MCP_JSON_PATH)).toBe(true);

    const pluginJson = JSON.parse(
      readFileSync(PLUGIN_JSON_PATH, 'utf-8'),
    ) as PluginJson;
    expect(referencesStandardHooksManifest(pluginJson.hooks)).toBe(false);
    expect(referencesRootMcpConfig(pluginJson.mcpServers)).toBe(true);

    expect(Object.values(readPluginMcpServers())).toEqual([
      {
        command: 'node',
        // The host's env var spelling is QODER_PLUGIN_ROOT (35dc3f5 measured
        // the installed manifest at all-QODER/0-CLAUDE); the former CLAUDE
        // pin predated that sweep and never matched the shipped .mcp.json.
        args: ['${QODER_PLUGIN_ROOT}/bridge/mcp-server.cjs'],
      },
    ]);
  });

  it('keeps the complete hook dependency and template payload source-controlled', () => {
    const requiredFiles = listSourceControlledPackageFiles();

    expect(requiredFiles).toContain('commands/omq-setup.md');
    expect(requiredFiles).not.toHaveLength(0);
    expect(
      requiredFiles.filter((file) => !existsSync(join(PACKAGE_ROOT, file))),
    ).toEqual([]);
  });
});
