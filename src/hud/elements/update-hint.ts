/**
 * OMQ HUD - Update Hint Element
 *
 * Renders copy-pasteable one-liners for available OMQ / Claude Code updates,
 * in the same detail-line style as the context limit warning.
 */

import { RESET } from '../colors.js';

const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';

export interface UpdateHintInput {
  /** Latest OMQ version when an update is available, else null */
  omqUpdateAvailable: string | null;
  /** Update channel the OMQ update belongs to; 'marketplace' means a plugin install */
  omqUpdateSource: 'npm' | 'marketplace' | null;
  /** Latest Claude Code version when an update is available, else null */
  claudeCodeUpdateAvailable: string | null;
}

/**
 * Render update hint detail lines (one per product, empty when up to date).
 *
 * The OMQ command follows the install channel recorded by the session-start
 * update check: marketplace installs cannot be updated through npm.
 */
export function renderUpdateHints(input: UpdateHintInput): string[] {
  const lines: string[] = [];

  if (input.omqUpdateAvailable) {
    const command =
      input.omqUpdateSource === 'marketplace'
        ? 'claude plugin marketplace update omc && claude plugin update oh-my-claudecode@omc'
        : 'npm i -g oh-my-claude-sisyphus@latest';
    lines.push(`${YELLOW}${BOLD}[!] omc ${input.omqUpdateAvailable} - paste: ! ${command}${RESET}`);
  }

  if (input.claudeCodeUpdateAvailable) {
    lines.push(
      `${YELLOW}${BOLD}[!] claude ${input.claudeCodeUpdateAvailable} - paste: ! claude update${RESET}`,
    );
  }

  return lines;
}
