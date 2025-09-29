//
// Copyright 2025 DXOS.org
//

// Regular expression to match renderable characters
// Excludes control characters, combining marks, and other non-renderable characters. Also excludes punctuation.
const renderableCharRegex =
  /^(?![\p{Control}\p{Mark}\p{Separator}\p{Surrogate}\p{Unassigned}\p{P}])[\p{L}\p{N}\p{S}\p{Emoji}]$/u;

/**
 * Returns the first two renderable characters from a string that are separated by non-word characters.
 * Handles Unicode characters correctly.
 *
 * @param {string} label The input string to process.
 * @returns {[string, string]} Array containing the two characters, or empty strings if not found.
 */
// TODO(burdon): Move to ui package.
export const getFirstTwoRenderableChars = (label: string): string[] => {
  const words = label.split(/\s+/);
  if (words.length === 2) {
    return words.map((word) => word[0].toUpperCase());
  }

  // Convert string to array of Unicode characters.
  const characters = Array.from(label);

  // Keep track of found renderable characters.
  const result = ['', ''];
  let foundFirst = false;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    if (renderableCharRegex.test(char)) {
      if (!foundFirst) {
        result[0] = char;
        foundFirst = true;
      } else {
        // Check if there's at least one non-word character between the first and current char.
        const textBetween = characters.slice(result[0].length, i).join('');
        if (/[^\p{L}\p{N}_]/u.test(textBetween)) {
          result[1] = char;
          break;
        }
      }
    }
  }

  return result;
};
