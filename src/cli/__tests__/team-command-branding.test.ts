import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('team command branding', () => {
  it('uses omq team wording in command surfaces', () => {
    const teamCommandSource = readFileSync(join(__dirname, '..', 'commands', 'team.ts'), 'utf-8');
    const cliIndexSource = readFileSync(join(__dirname, '..', 'index.ts'), 'utf-8');

    expect(teamCommandSource).toContain('omq team');
    expect(teamCommandSource).not.toContain('omx team');
    expect(cliIndexSource).toContain('omq team api');
    expect(cliIndexSource).not.toContain('omx team api');
  });

  it('names this plugin and its own setup skill in the installed-version footer', () => {
    const cliIndexSource = readFileSync(join(__dirname, '..', 'index.ts'), 'utf-8');

    // The old string combined this fork's namespace with a skill name it does not
    // ship (`omc-setup`), and named a host that is not this one, so it read as
    // correct to any check that only looked for the ancestor namespace prefix.
    expect(cliIndexSource).toContain(
      "Start Qoder CLI and use /oh-my-qoder:omq-setup for interactive setup.",
    );
    expect(cliIndexSource).not.toContain('/oh-my-qoder:omc-setup');
    expect(cliIndexSource).not.toContain('Start Claude Code and use');
  });
});
