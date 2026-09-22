#!/usr/bin/env sh

# Mirrors src/utils/config-dir.ts. ~/.qoder also holds cross-product files on a
# CN machine, so only the CLI's own state marks the distribution.
resolve_default_config_dir() {
  home="${1:-$HOME}"
  if [ -f "$home/.qoder-cn/settings.json" ] || [ -d "$home/.qoder-cn/plugins" ]; then
    printf '%s\n' "$home/.qoder-cn"
  else
    printf '%s\n' "$home/.qoder"
  fi
}

resolve_claude_config_dir() {
  configured="${QODER_CONFIG_DIR:-${QODERCN_CONFIG_DIR:-}}"
  if [ -z "$configured" ]; then
    resolve_default_config_dir
    return
  fi
  configured="${configured%/}"
  case "$configured" in
    \~)
      printf '%s\n' "$HOME"
      ;;
    \~/*)
      configured="${configured#\~/}"
      printf '%s/%s\n' "$HOME" "$configured"
      ;;
    *)
      printf '%s\n' "$configured"
      ;;
  esac
}
