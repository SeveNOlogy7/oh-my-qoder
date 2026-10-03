import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
// The ancestor shipped a .github/workflows/ci.yml release pipeline; this fork
// deliberately ships only build.yml (N4 family: ancestor infra files removed)
// and drives the narrow maintainer transaction from scripts/release.ts
// instead. Pin the fork's real release surface: the tracked scripts, the
// credential-free build workflow, and the documented guidance -- no invented
// ci.yml content.
const BUILD_WORKFLOW = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'build.yml'), 'utf-8');
const CONTRIBUTING = readFileSync(join(REPO_ROOT, 'CONTRIBUTING.md'), 'utf-8');
const RELEASE_SCRIPT = readFileSync(join(REPO_ROOT, 'scripts', 'release.ts'), 'utf-8');
const SHIPPING_SCRIPT = readFileSync(
  join(REPO_ROOT, 'scripts', 'plugin-shipping-surface.mjs'),
  'utf-8',
);
const PACKAGE_JSON = JSON.parse(
  readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'),
) as { scripts?: Record<string, string> };

describe('plugin shipping release guidance', () => {
  it('keeps the maintainer transaction in tracked scripts without resurrecting ancestor wrappers', () => {
    // The ancestor wired verify/check-pr/stage through package.json scripts and
    // a ci.yml pipeline. The fork drives the tracked scripts directly via
    // `node scripts/...` and ships no such wrappers -- re-adding them without
    // the ancestor pipeline would only advertise entry points nothing calls.
    expect(existsSync(join(REPO_ROOT, 'scripts', 'plugin-shipping-surface.mjs'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'scripts', 'release.ts'))).toBe(true);
    expect(
      Object.keys(PACKAGE_JSON.scripts ?? {}).filter((name) => name.startsWith('plugin:shipping:')),
    ).toEqual([]);
    expect(BUILD_WORKFLOW).not.toContain('plugin:shipping:verify');
    expect(BUILD_WORKFLOW).not.toContain('plugin:shipping:check-pr');
    // The verify/stage entrypoints still exist in the tracked maintainer script.
    expect(SHIPPING_SCRIPT).toContain("command === 'verify'");
    expect(SHIPPING_SCRIPT).toContain("command === 'stage'");
  });

  it('keeps the only shipped workflow credential-free', () => {
    expect(BUILD_WORKFLOW).toMatch(/permissions:\n\s+contents: read/);
    expect(BUILD_WORKFLOW).not.toMatch(/pull-requests:\s*write/);
    expect(BUILD_WORKFLOW).not.toContain('GH_TOKEN');
    expect(BUILD_WORKFLOW).not.toContain('gh api');
    expect(BUILD_WORKFLOW).not.toContain('npm ci --ignore-scripts');
    // The candidate-artifact classifier stays available as an ordinary script;
    // CONTRIBUTING documents that it is non-authoritative (see below).
    expect(existsSync(join(REPO_ROOT, 'scripts', 'ci', 'check-no-committed-build-artifacts.mjs'))).toBe(true);
  });

  it('documents the non-authoritative candidate check and the containment roots', () => {
    expect(CONTRIBUTING).toContain('credential-free, candidate-side classifier');
    expect(CONTRIBUTING).toContain('non-authoritative for every contributor and maintainer');
    expect(CONTRIBUTING).toContain('workflow root **W**');
    expect(CONTRIBUTING).toContain('verifier/manifest root **B**');
    expect(CONTRIBUTING).toContain('final PR head **H**');
    expect(CONTRIBUTING).toContain('fresh eligible event');
    expect(CONTRIBUTING).toContain('remove this ordinary candidate check from required checks or supersede it');
    expect(CONTRIBUTING).not.toContain('cryptographically signed by that owner');
    expect(CONTRIBUTING).not.toContain('plugin:shipping:stage');
  });

  it('uses the narrow signed maintainer transaction instead of broad staging or protected pushes', () => {
    expect(RELEASE_SCRIPT).toMatch(
      // CRLF-tolerant: release.ts rides through git checkouts and its staged
      // file list carries \r\n line endings on Windows working trees.
      /npm run plugin:shipping:verify\r?\n\s+npm run plugin:shipping:stage\r?\n\s+git add --/,
    );
    expect(RELEASE_SCRIPT).toContain('git commit -S');
    expect(RELEASE_SCRIPT).toContain('git push origin HEAD:release/v${version}');
    expect(RELEASE_SCRIPT).not.toMatch(/git add -A\b/);
    expect(RELEASE_SCRIPT).not.toMatch(/git add -f(?:\s+--)?\s+(?:dist|bridge)\/?\b/);
    expect(SHIPPING_SCRIPT).toContain("return ['add', '-f', '--', ...normalized];");
    expect(SHIPPING_SCRIPT).not.toContain("['add', '-f', 'dist', 'bridge']");
    expect(RELEASE_SCRIPT).not.toMatch(/git push origin (?:dev|main)\b/);
    expect(RELEASE_SCRIPT).not.toMatch(/git (?:checkout|switch) main\b/);
    expect(RELEASE_SCRIPT).not.toMatch(/git merge (?:dev|main)\b/);
  });
});
