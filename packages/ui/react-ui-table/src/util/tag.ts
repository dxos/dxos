//
// Copyright 2025 DXOS.org
//

// TODO(ZaymonFC): Push this into the tag picker module.

/**
 * Regex pattern for matching tags in the format [Label](id)
 */
export const TAG_PATTERN_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Extracts tag IDs from a string in the format [Label](id)
 * @param value The string to extract IDs from
 * @returns Array of extracted IDs or undefined if no matches or value is not a string
 */
export const extractTagIds = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const ids: string[] = [];
  let match;

  // Use the global regex to find all matches
  while ((match = TAG_PATTERN_REGEX.exec(value)) !== null) {
    if (match[2]) {
      ids.push(match[2]);
    }
  }

  return ids.length > 0 ? ids : undefined;
};
