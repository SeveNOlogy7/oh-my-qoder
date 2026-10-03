/**
 * Canonical OMQ path conventions — single source of truth.
 * These strings also appear in scripts/lib/hud-wrapper-template.txt and
 * scripts/plugin-setup.mjs; keep them in sync (enforced by paths-consistency.test.ts).
 *
 * The marketplace slug is the MEASURED install layout (#44, 2026-10-01):
 * `qoderclicn plugins install <dir>` registers under
 * `plugins/cache/local/oh-my-qoder/<version>` — observed under
 * ~/.qoder-cn/plugins/cache with no `omq` slug present — so `local` is the
 * canonical tie-break and fallback. resolvePluginCacheBase() still scans every
 * slug, so a marketplace `omq` install keeps resolving.
 */
export const OMQ_PLUGIN_MARKETPLACE_SLUG = "local";
export const OMQ_PLUGIN_PACKAGE_NAME = "oh-my-qoder";
export const OMQ_PLUGIN_CACHE_REL = `plugins/cache/${OMQ_PLUGIN_MARKETPLACE_SLUG}/${OMQ_PLUGIN_PACKAGE_NAME}`;
export const OMQ_PLUGIN_MARKETPLACE_REL = `plugins/marketplaces/${OMQ_PLUGIN_MARKETPLACE_SLUG}`;
export const OMQ_HUD_DIST_REL = "dist/hud/index.js";
export const OMQ_HUD_WRAPPER_REL = "hud/omq-hud.mjs";
export const OMQ_HUD_WRAPPER_LIB_REL = "hud/lib/config-dir.mjs";
export const OMQ_CONFIG_FILE_REL = ".omq-config.json";
