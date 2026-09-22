/**
 * Regression test: skill markdown must resolve the config root, never guess it
 *
 * A recipe that defaults to `$HOME/.qoder` writes into the wrong tree on Qoder CN,
 * where that directory exists but holds only cross-product files - so the wrong
 * guess stays silent. Executable blocks must chain QODER_CONFIG_DIR and
 * QODERCN_CONFIG_DIR and stop loudly when neither is set.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Extract fenced code blocks from a markdown file.
 * Returns an array of { startLine, content, lang } for each ```lang ... ``` block.
 */
function extractCodeBlocks(
  filePath: string,
): { startLine: number; content: string; lang: string }[] {
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  const blocks: { startLine: number; content: string; lang: string }[] = [];

  let inBlock = false;
  let blockStart = 0;
  let blockLang = '';
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = /^```(\w*)/.exec(line.trim());
    if (!inBlock && open) {
      inBlock = true;
      blockStart = i + 2; // 1-indexed, next line
      blockLang = open[1];
      blockLines = [];
    } else if (inBlock && line.trim() === '```') {
      inBlock = false;
      blocks.push({ startLine: blockStart, content: blockLines.join('\n'), lang: blockLang });
    } else if (inBlock) {
      blockLines.push(line);
    }
  }

  return blocks;
}

/**
 * A config root spelled out instead of resolved. Two shapes count: one joined
 * onto a home directory (`$HOME/.qoder`, `~/.qoder`, `homedir(),'.qoder'`), and a
 * bare `'.qoder'` handed to a path join. A project-relative `.qoder/rules` path is
 * a different directory and is not a guess about where the CLI keeps its state.
 */
const GUESSED_CONFIG_ROOT =
  /(?:~|\$HOME|\$\{HOME\})\/\.qoder(?![-\w])|['"]\.qoder['"]\s*[),]/;
/**
 * In a settings.json example only an absolute or home-joined root counts as a
 * guess - the CLI expands whatever is written there verbatim. A project-relative
 * `.qoder/omq.jsonc` is a different file entirely.
 */
const GUESSED_ABSOLUTE_ROOT =
  /(?:\$HOME|~|[A-Za-z]:[\\/]Users[\\/][^"'\\/]+)[\\/]\.qoder(?![-\w])/;
const EXECUTABLE_BLOCK_LANGS = new Set(['bash', 'json', 'jsonc']);

/**
 * Find lines that guess the config root instead of resolving it: a shell or
 * `node -e` default in executable blocks, any literal path in a settings.json
 * example (those are written verbatim into the user's config and expanded by the
 * CLI later), and a shell expansion with a guessed default anywhere else - prose
 * is what the model copies into its tool calls.
 */
function findHardcodedHomeQoder(filePath: string): { line: number; text: string }[] {
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  const inExecutable = new Set<number>();
  const isExampleJson = new Set<number>();
  for (const block of extractCodeBlocks(filePath)) {
    if (!EXECUTABLE_BLOCK_LANGS.has(block.lang)) continue;
    const count = block.content.split('\n').length;
    for (let i = 0; i < count; i++) {
      (block.lang === 'json' || block.lang === 'jsonc' ? isExampleJson : inExecutable).add(block.startLine + i);
    }
  }

  const violations: { line: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    const guessed =
      isExampleJson.has(lineNo)
        ? GUESSED_ABSOLUTE_ROOT.test(line)
        : inExecutable.has(lineNo)
          ? GUESSED_CONFIG_ROOT.test(line)
          : /\$\{QODER_CONFIG_DIR:-/.test(line);
    if (guessed) violations.push({ line: lineNo, text: line.trim() });
  }

  return violations;
}

const SKILLS_ROOT = join(__dirname, '..', '..', '..', 'skills');

function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Find lines in full skill content (not just bash blocks) that use ~/.qoder
 * without portable notation like [$QODER_CONFIG_DIR|~/.qoder].
 * Issue #2155 §16 — LLMs read prose and use literal paths in tool calls.
 */
function findHardcodedTildeQoder(filePath: string): { line: number; text: string }[] {
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  const violations: { line: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match ~/.qoder (tilde form) used in prose/tool directives
    if (!/~\/\.qoder/.test(line)) continue;
    // Allow: portable notation [$QODER_CONFIG_DIR|~/.qoder].
    if (/\[\$QODER_CONFIG_DIR\|~\/\.qoder\]/.test(line)) continue;
    // Env-var fallbacks must use $HOME, not a literal tilde default.
    // Lines inside bash code blocks are checked here too for literal tilde paths.
    // Allow: comment lines and frontmatter
    const trimmed = line.trim();
    if (trimmed.startsWith('#') && !trimmed.startsWith('##')) continue; // frontmatter/comments
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;
    // Allow: glob patterns like ~/.qoder/** (permission patterns, not path resolution)
    if (/~\/\.qoder\/\*/.test(line)) continue;

    violations.push({ line: i + 1, text: trimmed });
  }

  return violations;
}

const ALL_FILES = findMarkdownFiles(SKILLS_ROOT);

/**
 * Baseline keys are POSIX paths relative to the skills root. Deriving them by
 * stripping everything before "skills/" leaves a backslash Windows path that
 * matches nothing, so every lookup silently fell back to a zero baseline.
 */
function labelFor(filePath: string): string {
  return join('skills', relative(SKILLS_ROOT, filePath)).split(sep).join('/');
}

describe('skill markdown executable blocks must resolve the config root', () => {
  it.each(ALL_FILES.map((f) => [labelFor(f), f]))(
    '%s resolves the config root instead of guessing it',
    (_label, filePath) => {
      const violations = findHardcodedHomeQoder(filePath);
      if (violations.length > 0) {
        const details = violations
          .map((v) => `  line ${v.line}: ${v.text}`)
          .join('\n');
        expect.fail(
          `Found a config root spelled out instead of resolved:\n${details}\n` +
          `Replace shell defaults with: \${QODER_CONFIG_DIR:-\${QODERCN_CONFIG_DIR:?not set - run this inside a Qoder session}}\n` +
          `Replace node -e defaults with: process.env.QODER_CONFIG_DIR||process.env.QODERCN_CONFIG_DIR, throwing when unset\n` +
          `Replace settings.json examples with: $HOME/<the installed distribution's config dir>\n` +
          `Replace prose path references with: $QODER_CONFIG_DIR/<rest-of-path>`
        );
      }
    },
  );
});

describe('skill markdown prose must not use raw ~/.qoder (Contract 6, issue #2155 §16)', () => {
  // Known existing violations per skill directory (baseline snapshot).
  // These are real issues documented in #2155 §16 but predate this regression test.
  // This test prevents NEW violations from being introduced.
  // To reduce the baseline: fix the skill prose to use [$QODER_CONFIG_DIR|~/.qoder] notation,
  // then lower the count here.
  const KNOWN_VIOLATION_BASELINE: Record<string, number> = {
    'skills/cancel/SKILL.md': 4,
    'skills/configure-notifications/SKILL.md': 5,
    'skills/hud/SKILL.md': 8,
    'skills/omq-doctor/SKILL.md': 7,
    'skills/omq-setup/SKILL.md': 5,
    'skills/omq-setup/phases/01-install-agents-md.md': 4,
    'skills/omq-setup/phases/02-configure.md': 3,
    'skills/omq-setup/phases/03-integrations.md': 3,
    'skills/skill/SKILL.md': 8,
    'skills/team/SKILL.md': 6,
  };

  it.each(ALL_FILES.map((f) => [labelFor(f), f]))(
    '%s has no new unguarded ~/.qoder in prose',
    (label, filePath) => {
      const violations = findHardcodedTildeQoder(filePath);
      const baseline = KNOWN_VIOLATION_BASELINE[label] ?? 0;

      if (violations.length > baseline) {
        const details = violations
          .map((v) => `  line ${v.line}: ${v.text}`)
          .join('\n');
        expect.fail(
          `Found ${violations.length} ~/.qoder violations (baseline: ${baseline}, new: ${violations.length - baseline}):\n${details}\n` +
          `Replace with: [$QODER_CONFIG_DIR|~/.qoder] or use \${QODER_CONFIG_DIR:-$HOME/.qoder} in code`
        );
      }
    },
  );

  it('total baseline should not increase (tracks overall progress)', () => {
    let totalViolations = 0;
    for (const filePath of ALL_FILES) {
      totalViolations += findHardcodedTildeQoder(filePath).length;
    }
    const totalBaseline = Object.values(KNOWN_VIOLATION_BASELINE).reduce((a, b) => a + b, 0);

    // This assertion catches violations in files not yet in the baseline
    expect(totalViolations).toBeLessThanOrEqual(totalBaseline);
  });
});
