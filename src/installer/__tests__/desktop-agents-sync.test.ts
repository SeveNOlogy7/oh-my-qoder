/**
 * Desktop Agent Store Sync Tests
 *
 * Verifies that syncDesktopAgents mirrors the package's agent definitions
 * into the Qoder desktop's own agent store (com.qodercn.app.stable/
 * qoder-data.v1.json) with the courtesy rules: idempotent re-runs, updates
 * only pristine entries, user-edited and archived entries are never
 * overwritten, and entries whose source agent disappeared are removed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { syncDesktopAgents } from '../index.js';

let workspace = '';

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'desktop-agents-sync-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

const DEVICE_ID = 'device-1234';

function makeStore(extraAgents: Array<Record<string, unknown>> = []): string {
  const storePath = join(workspace, 'qoder-data.v1.json');
  writeFileSync(storePath, JSON.stringify({
    version: 22,
    schemaVersion: 22,
    agents: [
      {
        id: 'agent:preset:code-reviewer',
        name: 'Preset Reviewer',
        revision: 1,
        instructions: 'preset instructions',
        runtime: { deviceId: DEVICE_ID },
      },
      ...extraAgents,
    ],
  }, null, 1));
  return storePath;
}

function makeAgentsDir(files: Record<string, string>): string {
  const dir = join(workspace, 'agents-src');
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

function agentFile(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;
}

const CLOSED = { desktopRunning: false };

describe('syncDesktopAgents', () => {
  it('adds missing OMQ entries with the desktop entry shape', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({
      'analyst.md': agentFile('analyst', 'Pre-planning consultant', 'You are the analyst.'),
    });

    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    expect(result.synced).toBe(true);
    expect(result.added).toEqual(['OMQ analyst']);
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    expect(store.agents).toHaveLength(2);
    const entry = store.agents.find((a: { name: string }) => a.name === 'OMQ analyst');
    expect(entry).toMatchObject({
      description: 'Pre-planning consultant',
      instructions: 'You are the analyst.',
      enabled: true,
      collaborationEnabled: false,
      revision: 1,
      model: null,
      permissionMode: 'auto',
      cloudAgentId: null,
      runtimeProfileId: 'runtime:qoder',
    });
    expect(entry.runtime.deviceId).toBe(DEVICE_ID);
    expect(entry.runtime.serverRegistrationId).toBeNull();
    expect(store.agents.find((a: { name: string }) => a.name === 'Preset Reviewer').instructions).toBe('preset instructions');
  });

  it('is idempotent: a second run changes nothing', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({
      'analyst.md': agentFile('analyst', 'Pre-planning consultant', 'You are the analyst.'),
    });
    syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });
    const before = readFileSync(storePath, 'utf-8');

    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    expect(result.reason).toBe('already in sync');
    expect(result.added).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(readFileSync(storePath, 'utf-8')).toBe(before);
  });

  it('updates a pristine entry when the source changes, bumping revision', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({
      'analyst.md': agentFile('analyst', 'Pre-planning consultant', 'You are the analyst.'),
    });
    syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    writeFileSync(join(agentsDir, 'analyst.md'), agentFile('analyst', 'Updated consultant description', 'You are the analyst, v2.'));
    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    expect(result.updated).toEqual(['OMQ analyst']);
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    const entry = store.agents.find((a: { name: string }) => a.name === 'OMQ analyst');
    expect(entry.description).toBe('Updated consultant description');
    expect(entry.instructions).toBe('You are the analyst, v2.');
    expect(entry.revision).toBe(2);
  });

  it('never overwrites a user-edited entry (revision > 1)', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({
      'analyst.md': agentFile('analyst', 'Pre-planning consultant', 'You are the analyst.'),
    });
    syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    const entry = store.agents.find((a: { name: string }) => a.name === 'OMQ analyst');
    entry.revision = 2;
    entry.instructions = 'My customized prompt.';
    writeFileSync(storePath, JSON.stringify(store, null, 1));

    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    expect(result.updated).toHaveLength(0);
    const after = JSON.parse(readFileSync(storePath, 'utf-8'));
    expect(after.agents.find((a: { name: string }) => a.name === 'OMQ analyst').instructions).toBe('My customized prompt.');
  });

  it('removes OMQ entries whose source agent disappeared, keeping user-edited ones', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({
      'analyst.md': agentFile('analyst', 'Pre-planning consultant', 'You are the analyst.'),
      'explore.md': agentFile('explore', 'Codebase search', 'You are explore.'),
    });
    syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    rmSync(join(agentsDir, 'analyst.md'));
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    const explore = store.agents.find((a: { name: string }) => a.name === 'OMQ explore');
    explore.revision = 3;
    writeFileSync(storePath, JSON.stringify(store, null, 1));

    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    expect(result.removed).toEqual(['OMQ analyst']);
    const after = JSON.parse(readFileSync(storePath, 'utf-8'));
    expect(after.agents.some((a: { name: string }) => a.name === 'OMQ analyst')).toBe(false);
    expect(after.agents.some((a: { name: string }) => a.name === 'OMQ explore')).toBe(true);
  });

  it('skips when the desktop is running, leaving the store untouched', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({
      'analyst.md': agentFile('analyst', 'Pre-planning consultant', 'You are the analyst.'),
    });
    const before = readFileSync(storePath, 'utf-8');

    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, desktopRunning: true });

    expect(result.synced).toBe(false);
    expect(result.reason).toContain('running');
    expect(readFileSync(storePath, 'utf-8')).toBe(before);
  });

  it('returns a reason without throwing when the store does not exist', () => {
    const result = syncDesktopAgents(() => {}, {
      storePath: join(workspace, 'does-not-exist', 'qoder-data.v1.json'),
      agentsDir: join(workspace, 'agents-src'),
      ...CLOSED,
    });

    expect(result.synced).toBe(false);
    expect(result.reason).toBe('desktop agent store not found');
  });

  it('handles CRLF agent files', () => {
    const storePath = makeStore();
    const agentsDir = makeAgentsDir({});
    writeFileSync(join(agentsDir, 'tracer.md'), agentFile('tracer', 'Evidence-driven tracing', 'You are tracer.').replace(/\n/g, '\r\n'));

    const result = syncDesktopAgents(() => {}, { storePath, agentsDir, ...CLOSED });

    expect(result.added).toEqual(['OMQ tracer']);
    const store = JSON.parse(readFileSync(storePath, 'utf-8'));
    const entry = store.agents.find((a: { name: string }) => a.name === 'OMQ tracer');
    expect(entry.instructions).not.toMatch(/\r/);
  });
});
