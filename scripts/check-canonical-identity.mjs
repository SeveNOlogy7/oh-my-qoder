#!/usr/bin/env node
/**
 * Guard the repository identity that ships to users.
 *
 * Doc links, update checks and marketplace metadata have previously pointed at
 * organisations that no longer own this repository. Those URLs keep working while
 * GitHub's rename redirect stands, then start serving somebody else's content the
 * moment the old login is re-registered - so the check compares every distribution
 * URL against the owner declared in package.json instead of a hardcoded guess.
 *
 * Provenance references to upstream issues and pull requests (`@see .../issues/1719`)
 * are intentionally allowed: they record where behaviour came from, they are not a
 * source that anything installs or executes.
 *
 * Usage: node scripts/check-canonical-identity.mjs [dir] [--json] [--require-attribution]
 * Exit 0 = clean, 1 = violations found, 2 = the check itself could not run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter(a => a !== '--json' && a !== '--require-attribution');
const json = process.argv.includes('--json');
const requireAttribution = process.argv.includes('--require-attribution');
const target = resolve(args[0] ?? repoRoot);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'coverage', '.omq', '.omq', '.qoder']);
const TEXT_EXT = /\.(ts|mjs|cjs|js|md|json|sh|txt|yml|yaml)$/i;

function readPkg(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

/** `git+https://github.com/<owner>/<repo>.git` -> `<owner>/<repo>`. */
function slugFromUrl(url) {
  const m = /github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?]|$)/.exec(url ?? '');
  return m ? `${m[1].toLowerCase()}/${m[2].toLowerCase()}` : null;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.' || entry === '..') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, out);
    } else if (TEXT_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Test fixtures mock remote URLs with arbitrary owners; they are data, not a source
 * anyone resolves. Note they still ship, because `files` includes `dist`.
 */
function isFixturePath(file) {
  return /__tests__|\.test\./.test(file);
}

function isProvenance(line) {
  return /(issues|pull)\/\d+/.test(line);
}

/* ------------------------------------------------------------------
 * Plugin namespace rule (guidance surface only).
 *
 * A skill or agent address inside installed guidance is an instruction: the
 * reader is told to call `Skill("<ns>:<name>")` or `Task(subagent_type="<ns>:...")`
 * or to type `/ns:name`. If `<ns>` is not this plugin's own registered name the
 * address cannot resolve on this host, so the guidance routes to something that
 * does not exist -- even though nothing about it is a URL.
 *
 * Scope is deliberately narrow. TypeScript matchers accept foreign spellings as
 * input on purpose (two-way tolerance), and migration docs name the ancestor
 * product to be accurate about it; both would be false positives here.
 * ------------------------------------------------------------------ */
const GUIDANCE_SCOPE = [
  /^skills\/.*\.md$/,
  /^commands\/.*\.md$/,
  /^docs\/CLAUDE\.md$/,
  /^CLAUDE\.md$/,
  /^\.github\/CLAUDE\.md$/,
];

// Only the shapes guidance actually uses to tell a reader to address something:
// an invocation call, an agent-type value, a slash command at a token boundary,
// or an MCP tool name. The boundary matters: `src/hooks/session.ts:45` and
// `pull/$n/head:pr-1` are paths, and HUD token names like `repo:name` / `ctx:67%`
// and specifiers like `node:os` are prose -- none of them is an address.
const NS_PATTERNS = [
  {
    re: /(?:Skill\(\s*(?:skill=)?["'`]|subagent_type\s*[:=]\s*["'`])([a-z0-9][a-z0-9._-]{2,}):([a-z0-9][a-z0-9._-]{1,})/g,
    ns: 1,
    id: 2,
  },
  {
    re: /(^|[\s(`"'])\/([a-z0-9][a-z0-9._-]{2,}):([a-z0-9][a-z0-9._-]{1,})/g,
    ns: 2,
    id: 3,
  },
  { re: /mcp__plugin_([a-z0-9][a-z0-9._-]{1,})_t__/g, ns: 1, id: null },
];

function pluginNamespace(targetDir, pkg) {
  try {
    const manifest = JSON.parse(readFileSync(join(targetDir, '.qoder-plugin', 'plugin.json'), 'utf8'));
    if (typeof manifest.name === 'string' && manifest.name.trim()) return manifest.name.trim().toLowerCase();
  } catch {
    // No manifest (or unreadable): fall back to the package name.
  }
  return String(pkg?.name ?? '').toLowerCase();
}

function checkForeignNamespaces(targetDir, files, ownNamespace) {
  if (!ownNamespace) return [];
  const found = [];
  for (const file of files) {
    const rel = relative(targetDir, file).split(sep).join('/');
    if (!GUIDANCE_SCOPE.some((re) => re.test(rel))) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const push = (ns, identifier) => {
        if (ns.toLowerCase() === ownNamespace) return;
        found.push({
          file: rel,
          line: i + 1,
          namespace: ns.toLowerCase(),
          identifier,
          text: line.trim().slice(0, 160),
        });
      };
      for (const { re, ns: nsGroup, id: idGroup } of NS_PATTERNS) {
        for (const match of line.matchAll(re)) push(match[nsGroup], idGroup === null ? 'mcp tool' : match[idGroup]);
      }
    }
  }
  return found;
}

/* ------------------------------------------------------------------
 * Ancestor provenance rule (path-level coverage).
 *
 * The identity rule above guards OMQ's own URLs. A separate concern is
 * whether files derived from the ancestor project (Yeachan-Heo/oh-my-claudecode)
 * carry proper attribution. ATTRIBUTION.json, when present, must classify
 * EVERY scanned path under the target with a valid class.
 *
 * Contract: { schemaVersion: 1, entries: [{ path, class, ancestorBlobSha?,
 *            patchId?, lineageSha? }] }
 * Valid classes: "ancestor-derived" | "omq-patched-ancestor" |
 *                "omq-original" | "generated"
 * "omq-patched-ancestor" entries MUST include ancestorBlobSha and patchId.
 *
 * This rule does NOT reuse isFixturePath or isProvenance. Ancestor
 * attribution most often appears on lines that mention issue/PR numbers
 * (which isProvenance would silence) and can appear in test fixtures
 * (which isFixturePath would skip). Skipping those would defeat the gate.
 *
 * --require-attribution: fail closed when ATTRIBUTION.json is missing.
 *   CI and release builds use this to guarantee every shipped path is
 *   accounted for before publishing.
 * Without the flag: lenient — a bare local checkout (before the attribution
 *   generator has run) still passes the gate. This split exists so that
 *   developers cloning the repo for the first time are not blocked by a
 *   manifest that is generated as part of the release pipeline.
 * ------------------------------------------------------------------ */
const VALID_ATTRIBUTION_CLASSES = new Set([
  'ancestor-derived',
  'omq-patched-ancestor',
  'omq-original',
  'generated',
]);
const PROVENANCE_LIST_CAP = 20;

function checkAncestorProvenance(target, allFiles, requireAttribution) {
  let attribution;
  try {
    attribution = JSON.parse(readFileSync(join(target, 'ATTRIBUTION.json'), 'utf8'));
  } catch {
    // ATTRIBUTION.json not yet generated.
    // Without --require-attribution we stay lenient so a bare local checkout
    // still passes. With --require-attribution CI/release builds fail closed.
    if (requireAttribution) {
      return [{ file: '(ATTRIBUTION.json)', reason: 'ATTRIBUTION.json is missing and --require-attribution is set' }];
    }
    return [];
  }

  const violations = [];

  // Validate contract shape exactly.
  if (attribution.schemaVersion !== 1) {
    return [{ file: '(ATTRIBUTION.json)', reason: `schemaVersion must be 1, got ${JSON.stringify(attribution.schemaVersion)}` }];
  }
  if (!Array.isArray(attribution.entries)) {
    return [{ file: '(ATTRIBUTION.json)', reason: 'entries must be an array' }];
  }

  // Build set of known paths from entries, normalising backslashes.
  const knownPaths = new Set();
  for (const entry of attribution.entries) {
    if (!entry.path || typeof entry.path !== 'string') {
      violations.push({ file: '(ATTRIBUTION.json)', reason: `entry with invalid/missing path: ${JSON.stringify(entry)}` });
      continue;
    }
    const normPath = entry.path.replace(/[\\/]/g, '/');
    knownPaths.add(normPath);

    if (!VALID_ATTRIBUTION_CLASSES.has(entry.class)) {
      violations.push({ file: normPath, reason: `invalid class "${entry.class}"` });
      continue;
    }

    // omq-patched-ancestor must carry ancestorBlobSha and patchId.
    if (entry.class === 'omq-patched-ancestor') {
      if (!entry.ancestorBlobSha || !entry.patchId) {
        violations.push({
          file: normPath,
          reason: 'omq-patched-ancestor entry missing ancestorBlobSha or patchId',
        });
      }
    }
  }

  // Path coverage: every scanned file must appear in ATTRIBUTION.json.
  const unlisted = [];
  for (const file of allFiles) {
    const relPath = relative(target, file).split(sep).join('/');
    if (relPath === 'ATTRIBUTION.json') continue;
    if (!knownPaths.has(relPath)) {
      unlisted.push(relPath);
    }
  }

  for (let i = 0; i < Math.min(unlisted.length, PROVENANCE_LIST_CAP); i++) {
    violations.push({ file: unlisted[i], reason: 'not listed in ATTRIBUTION.json' });
  }
  if (unlisted.length > PROVENANCE_LIST_CAP) {
    violations.push({
      file: `... and ${unlisted.length - PROVENANCE_LIST_CAP} more`,
      reason: 'not listed in ATTRIBUTION.json',
    });
  }

  return violations;
}

/* ------------------------------------------------------------------
 * Owner/repo visibility rule.
 *
 * The URL rule above only fires on `github.com/<owner>/<canonicalRepo>` and
 * the namespace rule only on guidance addresses. A full owner-slash-repo
 * reference in any other shape is invisible to both: a bare slug naming
 * this repo in prose or shell, or a URL naming an ANCESTOR repo (`Yeachan-Heo/oh-my-claudecode`,
 * `Yeachan-Heo/oh-my-codex`) under a brand-new owner. That is exactly the class
 * #60 filed: an ancestor/external link can silently regress while the gate
 * stays green.
 *
 * The rule enumerates every reference to a LINEAGE repo name (this repo and its
 * ancestors) in two shapes -- a github URL and a bare slug -- and requires each
 * resulting `<owner>/<repo>` to be on an explicit allowlist measured from the
 * tree (canonical, fork evidence, intentional provenance narrative, functional
 * alias seeds). Anything else is a violation.
 *
 * Scope notes, each measured:
 *  - Test fixtures are skipped (isFixturePath): fixture owners are data.
 *  - docs/negative-control/*.txt are skipped: carriers quote violations
 *    verbatim as evidence, so an evidence file must not fail on its quotes.
 *  - The repo name must match exactly (optional `.git`): `bin/oh-my-qoder.js`,
 *    `oh-my-claudecode.yaml`, `oh-my-qoder-plugin.zip` and the separate
 *    `oh-my-claudecode-website` repo are file paths or different projects,
 *    not lineage references. The trailing boundary is an EXPLICIT extension
 *    exemption, not a blanket `.` exclusion: the original `(?![\w.-])`
 *    lookahead also swallowed a sentence period glued to the slug (the
 *    "<foreign-owner>/oh-my-qoder." shape), hiding real violations. Now
 *    only a known file extension (`.git`, `.js`, `.yaml`, ...) exempts the
 *    match; a period followed by anything else -- including end of
 *    reference -- leaves it a counted reference.
 * ------------------------------------------------------------------ */
const LINEAGE_REPO_GROUP = '(oh-my-qoder|oh-my-claudecode|oh-my-codex)';
// Measured from the tree: the only dotted forms that legally follow a lineage
// repo name are file extensions (.git .js .mjs .cjs .ts .tsx .jsx .yaml .yml
// .json .zip .md .sh .cmd .ps1 .ctl). Any other trailing period is prose
// punctuation and must NOT exempt the reference.
const OWNERSLUG_EXT_EXEMPTION =
  '(?!\\.(?:git|js|mjs|cjs|ts|tsx|jsx|yaml|yml|json|zip|md|sh|cmd|ps1|ctl)\\b|[\\w-])';
const OWNERSLUG_URL_RE = new RegExp(
  `(?:github\\.com|raw\\.githubusercontent\\.com)[/:]([A-Za-z0-9._-]+)\\/${LINEAGE_REPO_GROUP}(?:\\.git)?${OWNERSLUG_EXT_EXEMPTION}`,
  'gi',
);
const OWNERSLUG_BARE_RE = new RegExp(
  `(?:^|[^\\w./-])([A-Za-z0-9][A-Za-z0-9._-]*)\\/${LINEAGE_REPO_GROUP}(?:\\.git)?${OWNERSLUG_EXT_EXEMPTION}`,
  'gi',
);

/**
 * Measured from the tree (see .omq/scratch/rerun/measure-ownerslug-t12.mjs):
 * 96 non-fixture references across exactly these 6 distinct slugs.
 */
const OWNERSLUG_ALLOWLIST = new Set([
  'qoder-plugins/oh-my-qoder', // canonical (package.json, plugin manifest, docs, skills)
  'yeachan-heo/oh-my-claudecode', // ancestor -- intentional provenance narrative (README, docs/, seminar, CONTRIBUTING, PSM alias examples)
  'yeachan-heo/oh-my-codex', // ancestor sibling -- README "For Codex users" pointer
  'sevenology7/oh-my-qoder', // fork, cited as evidence in docs/KNOWN-FAILURES.md and its renderer
  'spring-ai-alibaba/oh-my-qoder', // external alias seed, functional default in skills/project-session-manager/templates/projects.json
  'anthropics/oh-my-claudecode', // illustrative alias seed in docs/design/project-session-manager.md (same class as the template seed above); borderline, owner fact unverified
]);

const OWNERSLUG_CARRIER_SCOPE = /^docs\/negative-control\/.*\.txt$/;

function checkOwnerRepoReferences(target, files) {
  const counts = { refsSeen: 0, distinct: new Set() };
  const found = [];
  for (const file of files) {
    if (isFixturePath(file)) continue;
    const rel = relative(target, file).split(sep).join('/');
    if (OWNERSLUG_CARRIER_SCOPE.test(rel)) continue;
    let lines;
    try {
      lines = readFileSync(file, 'utf8').split(/\r?\n/);
    } catch {
      continue;
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const slugs = new Set();
      for (const re of [OWNERSLUG_URL_RE, OWNERSLUG_BARE_RE]) {
        for (const match of line.matchAll(re)) {
          slugs.add(`${match[1]}/${match[2]}`.toLowerCase());
        }
      }
      for (const slug of slugs) {
        counts.refsSeen += 1;
        counts.distinct.add(slug);
      }
      const bad = [...slugs].filter((slug) => !OWNERSLUG_ALLOWLIST.has(slug));
      // Same provenance carve-out as the URL rule: an `@see .../issues/<n>` line
      // records where behaviour came from, it is not a distribution source. The
      // script's own doc comment states this contract; applying it here keeps
      // the two rules agreeing on what provenance means.
      if (bad.length > 0 && !isProvenance(line)) {
        found.push({
          file: rel,
          line: i + 1,
          slugs: bad,
          text: line.trim().slice(0, 160),
        });
      }
    }
  }
  counts.distinctSlugs = counts.distinct.size;
  return { counts, violations: found };
}

function main() {
  let pkg;
  try {
    pkg = readPkg(target.startsWith(repoRoot) ? repoRoot : target);
  } catch (error) {
    console.error(`cannot read package.json for ${target}: ${error.message}`);
    return 2;
  }

  const canonical = slugFromUrl(pkg.repository?.url ?? pkg.repository) ?? slugFromUrl(pkg.homepage);
  if (!canonical) {
    console.error('package.json declares no repository/homepage URL to check against');
    return 2;
  }

  const [canonicalOwner, canonicalRepo] = canonical.split('/');
  const urlPattern = new RegExp(
    `(?:github\\.com|raw\\.githubusercontent\\.com)[/:]([A-Za-z0-9._-]+)/${canonicalRepo}`,
    'g',
  );

  const violations = [];
  const allFiles = walk(target);
  for (const file of allFiles) {
    if (isFixturePath(file)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!urlPattern.test(line)) continue;
      urlPattern.lastIndex = 0;
      for (const match of line.matchAll(urlPattern)) {
        if (match[1].toLowerCase() === canonicalOwner) continue;
        if (isProvenance(line)) continue;
        violations.push({
          file: relative(target, file).split(sep).join('/'),
          line: i + 1,
          owner: match[1],
          text: line.trim().slice(0, 160),
        });
      }
    }
  }

  // Ancestor provenance: path-level coverage, NOT silenced by isFixturePath/isProvenance.
  const provenanceViolations = checkAncestorProvenance(target, allFiles, requireAttribution);

  // Namespace rule: guidance files must address this plugin, not another one.
  const ownNamespace = pluginNamespace(target.startsWith(repoRoot) ? repoRoot : target, pkg);
  const namespaceViolations = checkForeignNamespaces(target, allFiles, ownNamespace);

  // Owner/repo rule: every lineage owner/repo reference must be allowlisted.
  const ownerslug = checkOwnerRepoReferences(target, allFiles);

  const clean = violations.length === 0 && provenanceViolations.length === 0 && namespaceViolations.length === 0
    && ownerslug.violations.length === 0;

  if (json) {
    console.log(JSON.stringify({
      canonical,
      plugin_namespace: ownNamespace,
      checked_root: target,
      violations,
      provenance: provenanceViolations,
      namespace: namespaceViolations,
      ownerslug: ownerslug.violations,
      ownerslug_refs_seen: ownerslug.counts.refsSeen,
      ownerslug_distinct_slugs: ownerslug.counts.distinctSlugs,
    }, null, 2));
  } else if (clean) {
    console.log(`canonical identity ok: ${canonical} (namespace "${ownNamespace}", ${allFiles.length} files scanned, ${ownerslug.counts.refsSeen} owner/repo refs across ${ownerslug.counts.distinctSlugs} slugs)`);
  } else {
    if (violations.length > 0) {
      console.error(`${violations.length} URL(s) name an owner other than "${canonicalOwner}":`);
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line} -> ${v.owner} :: ${v.text}`);
      }
    }
    if (provenanceViolations.length > 0) {
      console.error(`${provenanceViolations.length} provenance violation(s):`);
      for (const v of provenanceViolations) {
        console.error(`  ${v.file}: ${v.reason}`);
      }
    }
    if (namespaceViolations.length > 0) {
      console.error(`${namespaceViolations.length} guidance line(s) address a plugin other than "${ownNamespace}":`);
      for (const v of namespaceViolations) {
        console.error(`  ${v.file}:${v.line} -> ${v.namespace}:${v.identifier} :: ${v.text}`);
      }
    }
    if (ownerslug.violations.length > 0) {
      console.error(`${ownerslug.violations.length} owner/repo reference(s) outside the lineage allowlist:`);
      for (const v of ownerslug.violations) {
        console.error(`  ${v.file}:${v.line} -> ${v.slugs.join(', ')} :: ${v.text}`);
      }
    }
  }

  return clean ? 0 : 1;
}

process.exit(main());
