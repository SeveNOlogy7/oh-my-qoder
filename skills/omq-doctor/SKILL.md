---
name: omq-doctor
description: Diagnose and fix oh-my-qoder installation issues
level: 3
---

# Doctor Skill

Note: All `[$QODER_CONFIG_DIR|~/.qoder]/...` paths in this guide respect `QODER_CONFIG_DIR` when that environment variable is set.

## Task: Run Installation Diagnostics

You are the OMQ Doctor - diagnose and fix installation issues.

### Step 1: Check Plugin Version

```bash
# Get installed and latest versions (cross-platform)
node -e "const p=require('path'),f=require('fs'),d=process.env.QODER_CONFIG_DIR||process.env.QODERCN_CONFIG_DIR||(()=>{throw new Error('config root unset - run this inside a Qoder session')})(),b=p.join(d,'plugins','cache',(()=>{try{const s=f.readdirSync(p.join(d,'plugins','cache')).filter(x=>f.existsSync(p.join(d,'plugins','cache',x,'oh-my-qoder')));return s.includes('omq')?'omq':(s[0]||'omq')}catch{return 'omq'}})(),'oh-my-qoder');try{const v=f.readdirSync(b).filter(x=>/^\d/.test(x)).sort((a,c)=>a.localeCompare(c,void 0,{numeric:true}));console.log('Installed:',v.length?v[v.length-1]:'(none)')}catch{console.log('Installed: (none)')}"
npm view oh-my-qoder version 2>/dev/null || echo "Latest: (unavailable)"
```

**Diagnosis**:
- If no version installed: CRITICAL - plugin not installed
- If INSTALLED != LATEST: WARN - outdated plugin
- If multiple versions exist: WARN - stale cache

### Step 2: Check for Legacy Hooks in settings.json

Read both `$QODER_CONFIG_DIR/settings.json` (profile-level) and `./.qoder/settings.json` (project-level) and check if there's a `"hooks"` key with entries like:
- `bash $QODER_CONFIG_DIR/hooks/keyword-detector.sh`
- `bash $QODER_CONFIG_DIR/hooks/persistent-mode.sh`
- `bash $QODER_CONFIG_DIR/hooks/session-start.sh`

**Diagnosis**:
- If found: CRITICAL - legacy hooks causing duplicates

### Step 3: Check for Legacy Bash Hook Scripts

```bash
ls -la "${QODER_CONFIG_DIR:-${QODERCN_CONFIG_DIR:?not set - run this inside a Qoder session}}"/hooks/*.sh 2>/dev/null
```

**Diagnosis**:
- If `keyword-detector.sh`, `persistent-mode.sh`, `session-start.sh`, or `stop-continuation.sh` exist: WARN - legacy scripts (can cause confusion)

### Step 4: Check AGENTS.md

```bash
CONFIG_DIR="${QODER_CONFIG_DIR:-${QODERCN_CONFIG_DIR:?not set - run this inside a Qoder session}}"
# Check if AGENTS.md exists
ls -la "$CONFIG_DIR"/AGENTS.md 2>/dev/null

# Check for OMQ markers (<!-- OMQ:START --> is the canonical marker)
grep -q "<!-- OMQ:START -->" "$CONFIG_DIR/AGENTS.md" 2>/dev/null && echo "Has OMQ config" || echo "Missing OMQ config in AGENTS.md"

# Check AGENTS.md (or deterministic companion) version marker and compare with latest installed plugin cache version
node -e "const p=require('path'),f=require('fs'),d=process.env.QODER_CONFIG_DIR||process.env.QODERCN_CONFIG_DIR||(()=>{throw new Error('config root unset - run this inside a Qoder session')})();const base=p.join(d,'AGENTS.md');let baseContent='';try{baseContent=f.readFileSync(base,'utf8')}catch{};let candidates=[base];let referenced='';const importMatch=baseContent.match(/AGENTS-[^ )]*\\.md/);if(importMatch){referenced=p.join(d,importMatch[0]);candidates.push(referenced)}else{const defaultCompanion=p.join(d,'AGENTS-omq.md');if(f.existsSync(defaultCompanion))candidates.push(defaultCompanion);try{const others=f.readdirSync(d).filter(n=>/^AGENTS-.*\\.md$/i.test(n)).sort().map(n=>p.join(d,n));for(const o of others){if(candidates.includes(o)===false)candidates.push(o)}}catch{}};let claudeV='(missing)';let claudeSource='(none)';for(const file of candidates){try{const c=f.readFileSync(file,'utf8');const m=c.match(/<!--\\s*OMQ:VERSION:([^\\s]+)\\s*-->/i);if(m){claudeV=m[1];claudeSource=file;break}}catch{}};if(claudeV==='(missing)'&&candidates.length>0){claudeV='(missing marker)';claudeSource='scanned deterministic AGENTS sources';};let pluginV='(none)';try{const b=p.join(d,'plugins','cache',(()=>{try{const s=f.readdirSync(p.join(d,'plugins','cache')).filter(x=>f.existsSync(p.join(d,'plugins','cache',x,'oh-my-qoder')));return s.includes('omq')?'omq':(s[0]||'omq')}catch{return 'omq'}})(),'oh-my-qoder');const v=f.readdirSync(b).filter(x=>/^\\d/.test(x)).sort((a,c)=>a.localeCompare(c,void 0,{numeric:true}));pluginV=v.length?v[v.length-1]:'(none)';}catch{};console.log('AGENTS.md OMQ version:',claudeV);console.log('OMQ version source:',claudeSource);console.log('Latest cached plugin version:',pluginV);if(claudeV==='(missing)'||claudeV==='(missing marker)'||pluginV==='(none)'){console.log('VERSION CHECK SKIPPED: missing AGENTS marker or plugin cache')}else if(claudeV===pluginV){console.log('VERSION MATCH: AGENTS and plugin cache are aligned')}else{console.log('VERSION DRIFT: AGENTS.md and plugin versions differ')}"

# Check companion files for file-split pattern (e.g. AGENTS-omq.md)
find "$CONFIG_DIR" -maxdepth 1 -type f -name 'AGENTS-*.md' -print 2>/dev/null
while IFS= read -r f; do
  grep -q "<!-- OMQ:START -->" "$f" 2>/dev/null && echo "Has OMQ config in companion: $f"
done < <(find "$CONFIG_DIR" -maxdepth 1 -type f -name 'AGENTS-*.md' -print 2>/dev/null)

# Check if AGENTS.md references a companion file
grep -o "AGENTS-[^ )]*\.md" "$CONFIG_DIR/AGENTS.md" 2>/dev/null
```

**Diagnosis**:
- If AGENTS.md missing: CRITICAL - AGENTS.md not configured
- If `<!-- OMQ:START -->` found in AGENTS.md: OK
- If `<!-- OMQ:START -->` found in a companion file (e.g. `AGENTS-omq.md`): OK - file-split pattern detected
- If no OMQ markers in AGENTS.md or any companion file: WARN - outdated AGENTS.md
- If `OMQ:VERSION` marker is missing from deterministic AGENTS source scan (base + referenced companion): WARN - cannot verify AGENTS.md freshness
- If `AGENTS.md OMQ version` != `Latest cached plugin version`: WARN - version drift detected (run `omq update` or `omq setup`)

### Step 5: Check Ralph Ruby Dependency

Ralph workflows require Ruby. Check for Ruby explicitly so fresh installations get actionable guidance instead of a later opaque Ralph failure.

```bash
if command -v ruby >/dev/null 2>&1; then
  echo "Ruby for Ralph: $(ruby --version 2>/dev/null | head -1)"
else
  echo "Ruby for Ralph: MISSING"
  echo "Install Ruby before using Ralph. Ubuntu/Debian: sudo apt update && sudo apt install ruby-full"
  echo "macOS: brew install ruby"
fi
```

**Diagnosis**:
- If Ruby is found: OK - Ralph dependency present
- If Ruby is missing: WARN - Ralph workflows may fail until Ruby is installed

### Step 6: Check for Stale Plugin Cache

```bash
# Count versions in cache (cross-platform)
node -e "const p=require('path'),f=require('fs'),d=process.env.QODER_CONFIG_DIR||process.env.QODERCN_CONFIG_DIR||(()=>{throw new Error('config root unset - run this inside a Qoder session')})(),b=p.join(d,'plugins','cache',(()=>{try{const s=f.readdirSync(p.join(d,'plugins','cache')).filter(x=>f.existsSync(p.join(d,'plugins','cache',x,'oh-my-qoder')));return s.includes('omq')?'omq':(s[0]||'omq')}catch{return 'omq'}})(),'oh-my-qoder');try{const v=f.readdirSync(b).filter(x=>/^\d/.test(x));console.log(v.length+' version(s):',v.join(', '))}catch{console.log('0 versions')}"
```

**Diagnosis**:
- If > 1 version: WARN - multiple cached versions (cleanup recommended)

### Step 7: Check for Legacy Curl-Installed Content

Check for legacy agents, commands, and skills installed via curl (before plugin system).
**Important**: Only flag files whose names match actual plugin-provided names. Do NOT flag user's custom agents/commands/skills that are unrelated to OMQ.

```bash
CONFIG_DIR="${QODER_CONFIG_DIR:-${QODERCN_CONFIG_DIR:?not set - run this inside a Qoder session}}"
# Check for legacy agents directory
ls -la "$CONFIG_DIR"/agents/ 2>/dev/null

# Check for legacy commands directory
ls -la "$CONFIG_DIR"/commands/ 2>/dev/null

# Check for legacy skills directory
ls -la "$CONFIG_DIR"/skills/ 2>/dev/null
```

**Diagnosis**:
- If `~/.qoder/agents/` exists with files matching plugin agent names: WARN - legacy agents (now provided by plugin)
- If `~/.qoder/commands/` exists with files matching plugin command names: WARN - legacy commands (now provided by plugin)
- If `~/.qoder/skills/` exists with files matching plugin skill names: WARN - legacy skills (now provided by plugin)
- If custom files exist that do NOT match plugin names: OK - these are user custom content, do not flag them

**Known plugin agent names** (check agents/ for these):
`architect.md`, `document-specialist.md`, `explore.md`, `executor.md`, `debugger.md`, `planner.md`, `analyst.md`, `critic.md`, `verifier.md`, `test-engineer.md`, `designer.md`, `writer.md`, `qa-tester.md`, `scientist.md`, `security-reviewer.md`, `code-reviewer.md`, `git-master.md`, `code-simplifier.md`

**Known plugin skill names** (check skills/ for these):
`ai-slop-cleaner`, `ask`, `autopilot`, `cancel`, `ccg`, `configure-notifications`, `deep-interview`, `deepinit`, `external-context`, `hud`, `skillify`, `learner`, `mcp-setup`, `omq-doctor`, `omq-setup`, `omq-teams`, `plan`, `project-session-manager`, `ralph`, `ralplan`, `release`, `sciomq`, `setup`, `skill`, `team`, `ultraqa`, `ultrawork`, `visual-verdict`, `writer-memory`

**Known plugin command names** (check commands/ for these):
`ultrawork.md`, `deepsearch.md`

---

## Report Format

After running all checks, output a report:

```
## OMQ Doctor Report

### Summary
[HEALTHY / ISSUES FOUND]

### Checks

| Check | Status | Details |
|-------|--------|---------|
| Plugin Version | OK/WARN/CRITICAL | ... |
| Legacy Hooks (settings.json) | OK/CRITICAL | ... |
| Legacy Scripts (~/.qoder/hooks/) | OK/WARN | ... |
| AGENTS.md | OK/WARN/CRITICAL | ... |
| Ralph Ruby Dependency | OK/WARN | ... |
| Plugin Cache | OK/WARN | ... |
| Legacy Agents (~/.qoder/agents/) | OK/WARN | ... |
| Legacy Commands (~/.qoder/commands/) | OK/WARN | ... |
| Legacy Skills (~/.qoder/skills/) | OK/WARN | ... |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommended Fixes
[List fixes based on issues]
```

---

## Auto-Fix (if user confirms)

If issues found, ask user: "Would you like me to fix these issues automatically?"

If yes, apply fixes:

### Fix: Legacy Hooks in settings.json
Remove the `"hooks"` section from `$QODER_CONFIG_DIR/settings.json` (keep other settings intact)

### Fix: Legacy Bash Scripts
```bash
CONFIG_DIR="${QODER_CONFIG_DIR:-${QODERCN_CONFIG_DIR:?not set - run this inside a Qoder session}}"
rm -f "$CONFIG_DIR"/hooks/keyword-detector.sh
rm -f "$CONFIG_DIR"/hooks/persistent-mode.sh
rm -f "$CONFIG_DIR"/hooks/session-start.sh
rm -f "$CONFIG_DIR"/hooks/stop-continuation.sh
```

### Fix: Outdated Plugin
> ⚠️ Confirm the resolved path with the user first. For a directory install the cache
> lives under `plugins/cache/local/` and is the live development copy — it cannot be
> re-downloaded from a marketplace.
```bash
# Clear plugin cache (cross-platform)
node -e "const p=require('path'),f=require('fs'),d=process.env.QODER_CONFIG_DIR||process.env.QODERCN_CONFIG_DIR||(()=>{throw new Error('config root unset - run this inside a Qoder session')})(),b=p.join(d,'plugins','cache',(()=>{try{const s=f.readdirSync(p.join(d,'plugins','cache')).filter(x=>f.existsSync(p.join(d,'plugins','cache',x,'oh-my-qoder')));return s.includes('omq')?'omq':(s[0]||'omq')}catch{return 'omq'}})(),'oh-my-qoder');try{f.rmSync(b,{recursive:true,force:true});console.log('Plugin cache cleared: '+b)}catch{console.log('No plugin cache found')}"
```

### Fix: Stale Cache (multiple versions)
> ⚠️ Deletes every version directory except the newest. Confirm the resolved path first.
```bash
# Keep only latest version (cross-platform)
node -e "const p=require('path'),f=require('fs'),d=process.env.QODER_CONFIG_DIR||process.env.QODERCN_CONFIG_DIR||(()=>{throw new Error('config root unset - run this inside a Qoder session')})(),b=p.join(d,'plugins','cache',(()=>{try{const s=f.readdirSync(p.join(d,'plugins','cache')).filter(x=>f.existsSync(p.join(d,'plugins','cache',x,'oh-my-qoder')));return s.includes('omq')?'omq':(s[0]||'omq')}catch{return 'omq'}})(),'oh-my-qoder');try{const v=f.readdirSync(b).filter(x=>/^\d/.test(x)).sort((a,c)=>a.localeCompare(c,void 0,{numeric:true}));v.slice(0,-1).forEach(x=>f.rmSync(p.join(b,x),{recursive:true,force:true}));console.log('Removed',v.length-1,'old version(s)')}catch(e){console.log('No cache to clean')}"
```

### Fix: Missing/Outdated AGENTS.md
Copy the canonical content from the plugin you already have on disk — never fetch it
over the network, which would let whoever owns the remote at that moment write this
agent's instruction file:
```
Read "${QODER_PLUGIN_ROOT}/docs/CLAUDE.md" and write it to $QODER_CONFIG_DIR/AGENTS.md
```
If `QODER_PLUGIN_ROOT` is unset, resolve the active plugin root the same way the other
recipes here do (scan `plugins/cache/*/oh-my-qoder` for the newest version directory).

### Fix: Legacy Curl-Installed Content

Remove legacy agents, commands, and skills directories (now provided by plugin):

```bash
CONFIG_DIR="${QODER_CONFIG_DIR:-${QODERCN_CONFIG_DIR:?not set - run this inside a Qoder session}}"
# Backup first (optional - ask user)
# mv "$CONFIG_DIR"/agents "$CONFIG_DIR"/agents.bak
# mv "$CONFIG_DIR"/commands "$CONFIG_DIR"/commands.bak
# mv "$CONFIG_DIR"/skills "$CONFIG_DIR"/skills.bak

# Or remove directly
rm -rf "$CONFIG_DIR"/agents
rm -rf "$CONFIG_DIR"/commands
rm -rf "$CONFIG_DIR"/skills
```

**Note**: Only remove if these contain oh-my-qoder-related files. If user has custom agents/commands/skills, warn them and ask before removing.

---

## Post-Fix

After applying fixes, inform user:
> Fixes applied. **Restart Qoder CLI** for changes to take effect.
