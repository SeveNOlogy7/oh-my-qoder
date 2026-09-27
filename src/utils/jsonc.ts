/**
 * Simple JSONC (JSON with Comments) parser
 *
 * Strips single-line (//) and multi-line (slash-star) comments from JSONC
 * before parsing with standard JSON.parse.
 */

/**
 * Parse JSONC content by stripping comments and parsing as JSON
 */
export function parseJsonc(content: string): unknown {
  const cleaned = stripJsoncComments(content);
  return JSON.parse(cleaned);
}

/**
 * Strip comments from JSONC content
 * Handles single-line (//) and multi-line comments, and drops a trailing comma that
 * precedes a closing brace/bracket. The comma removal is done by the same scan rather
 * than a post-pass regex, because a regex cannot tell `{"a":1,}` from `{"a":",}"}` --
 * the value in the second one is a legitimate two-character string.
 */
export function stripJsoncComments(content: string): string {
  let result = '';
  let i = 0;
  // Position of the most recent comma emitted outside a string, and whether only
  // whitespace has followed it. Comments are invisible here, so `, /* c */ }` counts.
  let pendingComma = -1;
  let whitespaceSinceComma = false;

  while (i < content.length) {
    // Check for single-line comment
    if (content[i] === '/' && content[i + 1] === '/') {
      // Skip until end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Check for multi-line comment start
    if (content[i] === '/' && content[i + 1] === '*') {
      // Skip until end of comment
      i += 2;
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    // Handle strings to avoid stripping comments inside strings
    if (content[i] === '"') {
      result += content[i];
      i++;
      while (i < content.length && content[i] !== '"') {
        if (content[i] === '\\') {
          result += content[i];
          i++;
          if (i < content.length) {
            result += content[i];
            i++;
          }
          continue;
        }
        result += content[i];
        i++;
      }
      if (i < content.length) {
        result += content[i];
        i++;
      }
      // A string is not whitespace: any comma before it belongs to the data.
      pendingComma = -1;
      whitespaceSinceComma = false;
      continue;
    }

    if (content[i] === ',') {
      pendingComma = result.length;
      whitespaceSinceComma = true;
      result += content[i];
      i++;
      continue;
    }

    if (content[i] === '}' || content[i] === ']') {
      if (pendingComma >= 0 && whitespaceSinceComma) {
        result = result.slice(0, pendingComma) + result.slice(pendingComma + 1);
      }
      pendingComma = -1;
      whitespaceSinceComma = false;
      result += content[i];
      i++;
      continue;
    }

    if (!/\s/.test(content[i])) {
      whitespaceSinceComma = false;
    }

    result += content[i];
    i++;
  }

  return result;
}
