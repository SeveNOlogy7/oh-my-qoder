import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// scripts/ and templates/ ship the same helper twice because a hook template
// cannot import from the repo's scripts tree. Nothing covered the copy, which is
// how the templates mirror lost the CN config-root probe that scripts/ and src/
// both have: the getter resolved ~/.qoder on a CN install and hooks then read
// the wrong root silently. Compare behaviour, not bytes -- the two files differ
// legitimately in exports and comments.
const canonicalModule = '../../scripts/lib/config-dir.mjs';
const templateModule = '../../templates/hooks/lib/config-dir.mjs';

describe('config-dir mirror parity (scripts/lib vs templates/hooks/lib)', () => {
  let homeIntl: string;
  let homeCnSettings: string;
  let homeCnPlugins: string;

  beforeAll(() => {
    const base = mkdtempSync(join(tmpdir(), 'config-dir-mirror-'));
    homeIntl = join(base, 'intl');
    homeCnSettings = join(base, 'cn-settings');
    homeCnPlugins = join(base, 'cn-plugins');
    for (const h of [homeIntl, homeCnSettings, homeCnPlugins]) mkdirSync(h, { recursive: true });
    mkdirSync(join(homeCnSettings, '.qoder-cn'), { recursive: true });
    writeFileSync(join(homeCnSettings, '.qoder-cn', 'settings.json'), '{}\n');
    mkdirSync(join(homeCnPlugins, '.qoder-cn', 'plugins'), { recursive: true });
  });

  afterAll(() => {
    rmSync(join(homeIntl, '..'), { recursive: true, force: true });
  });

  it('exports the same distribution directory names', async () => {
    const canonical = await import(canonicalModule);
    const template = await import(templateModule);
    expect(template.QODER_INTL_CONFIG_DIR_NAME).toBe(canonical.QODER_INTL_CONFIG_DIR_NAME);
    expect(template.QODER_CN_CONFIG_DIR_NAME).toBe(canonical.QODER_CN_CONFIG_DIR_NAME);
  });

  it('resolves the same root for every env and home shape', async () => {
    const canonical = await import(canonicalModule);
    const template = await import(templateModule);
    const cases: Array<[Record<string, string | undefined>, string]> = [
      [{}, homeIntl],
      [{ QODER_CONFIG_DIR: '' }, homeIntl],
      [{}, homeCnSettings],
      [{}, homeCnPlugins],
      [{ QODERCN_CONFIG_DIR: '' }, homeCnSettings],
      [{ QODER_CONFIG_DIR: '~' }, homeIntl],
      [{ QODERCN_CONFIG_DIR: '~' }, homeIntl],
      [{ QODER_CONFIG_DIR: '~/.omq-custom' }, homeIntl],
      [{ QODERCN_CONFIG_DIR: '~/.omq-custom-cn' }, homeIntl],
      [{ QODER_CONFIG_DIR: '/abs/root/' }, homeIntl],
      [{ QODER_CONFIG_DIR: '/abs/root/', QODERCN_CONFIG_DIR: '~/.ignored' }, homeIntl],
      [{ QODER_CONFIG_DIR: '  ', QODERCN_CONFIG_DIR: '/abs/cn' }, homeIntl],
    ];
    for (const [env, home] of cases) {
      expect(template.getQoderConfigDir(env, home)).toEqual(canonical.getQoderConfigDir(env, home));
    }
  });

  it('still discriminates the CN root, so the parity case above is not vacuous', async () => {
    const template = await import(templateModule);
    expect(template.getQoderConfigDir({}, homeCnSettings)).toBe(join(homeCnSettings, '.qoder-cn'));
    expect(template.getQoderConfigDir({}, homeIntl)).toBe(join(homeIntl, '.qoder'));
  });

  it('keeps the legacy template spelling as an alias of the canonical getter', async () => {
    const template = await import(templateModule);
    expect(template.getClaudeConfigDir).toBe(template.getQoderConfigDir);
  });
});
