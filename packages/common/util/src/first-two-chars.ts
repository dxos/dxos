// Regular expression to match renderable characters
// Excludes control characters, combining marks, and other non-renderable characters
//
// Copyright 2025 DXOS.org
//

const renderableCharRegex =
  /^(?![\p{Control}\p{Mark}\p{Separator}\p{Surrogate}\p{Unassigned}])[\p{L}\p{N}\p{P}\p{S}\p{Emoji}]$/u;

/**
 * Returns the first two renderable characters from a string that are separated by non-word characters.
 * Handles Unicode characters correctly.
 *
 * @param {string} label - The input string to process
 * @returns {[string, string]} Array containing the two characters, or empty strings if not found
 */
export const getFirstTwoRenderableChars = (label: string) => {
  // Convert string to array of Unicode characters
  const characters = Array.from(label);

  // Keep track of found renderable characters
  const result = ['', ''];
  let foundFirst = false;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (renderableCharRegex.test(char)) {
      if (!foundFirst) {
        result[0] = char;
        foundFirst = true;
      } else {
        // Check if there's at least one non-word character between the first and current char
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
