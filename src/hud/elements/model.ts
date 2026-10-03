/**
 * OMQ HUD - Model Element
 *
 * Renders the current model name.
 */

import { cyan } from '../colors.js';
import { truncateToWidth } from '../../utils/string-width.js';
import { DEFAULT_HUD_LABELS, type HudLabels, type ModelFormat } from '../types.js';

/**
 * Extract version from a model ID string.
 * Qwen (this fork's default provider):
 *       'qwen-max-0428' -> null (no embedded version)
 *       'qwen-max-v2' -> '2'
 *       'qwen-plus 2.5' -> '2.5'
 * Claude (provider this fork still routes to):
 *       'claude-opus-4-8-20260528' -> '4.8'
 *       'claude-sonnet-5' -> '5'
 *       'claude-3-5-sonnet-20241022' -> '3.5'
 */
function extractVersion(modelId: string): string | null {
  // Qwen hyphenated version patterns like max-v2, plus-v3
  const qwenMatch = modelId.match(/(?:max|plus|turbo)-v(\d+(?:\.\d+)?)/i);
  if (qwenMatch) return qwenMatch[1];

  // Claude hyphenated ID patterns like opus-4-8, sonnet-4-5, haiku-4-5
  const claudeIdMatch = modelId.match(/(?:opus|sonnet|haiku)-(\d+)-(\d+)/i);
  if (claudeIdMatch) return `${claudeIdMatch[1]}.${claudeIdMatch[2]}`;

  // Claude canonical IDs with a single trailing version like claude-sonnet-5
  const claudeSingleMatch = modelId.match(/(?:^|[.-])claude-(?:opus|sonnet|haiku)-(\d+)$/i);
  if (claudeSingleMatch) return claudeSingleMatch[1];

  // Claude legacy raw IDs like claude-3-5-sonnet-20241022 / claude-3-opus-20240229
  const claudeLegacyMatch = modelId.match(/claude-(\d+)(?:-(\d+))?-?(?:opus|sonnet|haiku)/i);
  if (claudeLegacyMatch) {
    return claudeLegacyMatch[2] ? `${claudeLegacyMatch[1]}.${claudeLegacyMatch[2]}` : claudeLegacyMatch[1];
  }

  // Display name patterns like "Max 2.5", "Sonnet 4.5"
  const displayMatch = modelId.match(/(?:max|plus|turbo|opus|sonnet|haiku)\s+(\d+(?:\.\d+)?)/i);
  if (displayMatch) return displayMatch[1];

  return null;
}

/**
 * Format model name for display.
 * Converts model IDs to friendly names based on the requested format.
 */
export function formatModelName(modelId: string | null | undefined, format: ModelFormat = 'short'): string | null {
  if (!modelId) return null;

  if (format === 'full') {
    return truncateToWidth(modelId, 40);
  }

  const id = modelId.toLowerCase();
  let shortName: string | null = null;

  if (id.includes('qwen-max') || id.includes('qwen_max')) shortName = 'Max';
  else if (id.includes('qwen-plus') || id.includes('qwen_plus')) shortName = 'Plus';
  else if (id.includes('qwen-turbo') || id.includes('qwen_turbo')) shortName = 'Turbo';
  else if (id.includes('opus')) shortName = 'Opus';
  else if (id.includes('sonnet')) shortName = 'Sonnet';
  else if (id.includes('haiku')) shortName = 'Haiku';

  if (!shortName) {
    // Return original if not recognized (CJK-aware truncation)
    return truncateToWidth(modelId, 20);
  }

  if (format === 'versioned') {
    const version = extractVersion(id);
    if (version) return `${shortName} ${version}`;
  }

  return shortName;
}

/**
 * Render model element.
 */
export function renderModel(
  modelId: string | null | undefined,
  format: ModelFormat = 'versioned',
  labels: Pick<HudLabels, 'model'> = DEFAULT_HUD_LABELS,
): string | null {
  const name = formatModelName(modelId, format);
  if (!name) return null;
  return cyan(`${labels.model}: ${name}`);
}
