import { describe, it, expect } from 'vitest';

describe('Cleanup Validation', () => {
  it('plan skill resolves under the identity it ships with', async () => {
    const { getBuiltinSkill } = await import('../features/builtin-skills/skills.js');
    // The loader keys on the SKILL.md frontmatter name, not the directory: since
    // the #37 rename skills/plan/ ships `name: omq-plan`, so the
    // ancestor 'omc-plan' lookup no longer resolves.
    expect(getBuiltinSkill('omq-plan')).toBeDefined();
    expect(getBuiltinSkill('omc-plan')).toBeUndefined();
  });

  it('plan skill is blocked by CC native denylist', async () => {
    const { getBuiltinSkill } = await import('../features/builtin-skills/skills.js');
    const skill = getBuiltinSkill('plan');
    expect(skill).toBeUndefined();
  });

  it('old keywords do not match active patterns', async () => {
    const { detectKeywordsWithType } = await import('../hooks/keyword-detector/index.js');
    const result = detectKeywordsWithType('ultrapilot build this');
    expect(result).toEqual([]);
  });

  it('deprecated keyword infrastructure is removed', async () => {
    const keywordModule = await import('../hooks/keyword-detector/index.js');
    expect('detectDeprecatedKeywords' in keywordModule).toBe(false);
    expect('DEPRECATED_KEYWORD_PATTERNS' in keywordModule).toBe(false);
  });

  it('PluginConfig.agents matches 19-agent registry + omq', async () => {
    const { DEFAULT_CONFIG } = await import('../config/loader.js');
    const agentKeys = Object.keys(DEFAULT_CONFIG.agents || {});
    expect(agentKeys).toContain('omq');
    expect(agentKeys).toContain('explore');
    expect(agentKeys).toContain('architect');
    expect(agentKeys).toContain('executor');
    expect(agentKeys).toContain('documentSpecialist');
    expect(agentKeys).toContain('critic');
    expect(agentKeys).toContain('tracer');
    // Stale entries should NOT be present
    expect(agentKeys).not.toContain('frontendEngineer');
    expect(agentKeys).not.toContain('documentWriter');
    expect(agentKeys).not.toContain('multimodalLooker');
    expect(agentKeys).not.toContain('coordinator');
    // Absorbed agents (consolidated in v4.8)
    expect(agentKeys).not.toContain('qualityReviewer');
    expect(agentKeys).not.toContain('deepExecutor');
    expect(agentKeys).not.toContain('buildFixer');
  });

  it('agent registry has 19 agents', async () => {
    const { getAgentDefinitions } = await import('../agents/definitions.js');
    const defs = getAgentDefinitions();
    expect(Object.keys(defs)).toHaveLength(19);
    expect(defs).toHaveProperty('tracer');
  });
});
