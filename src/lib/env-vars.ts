/** Env var set by omq CLI when --plugin-dir is passed; read by HUD wrapper and setup auto-detect. */
export const OMQ_PLUGIN_ROOT_ENV = "OMQ_PLUGIN_ROOT";

// Ancestor-spelling alias: vendored files import OMC_PLUGIN_ROOT_ENV, and the value
// stays the OMQ variable users actually set.
export const OMC_PLUGIN_ROOT_ENV = OMQ_PLUGIN_ROOT_ENV;
