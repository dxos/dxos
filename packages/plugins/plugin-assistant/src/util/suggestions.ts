//
// Copyright 2026 DXOS.org
//

/**
 * Extract starter-prompt suggestions from a skill's instructions markdown.
 *
 * Looks for the first `## Suggested starting prompts` heading (case-insensitive) and returns the
 * bullet-list items immediately following it. Items wrapped in single or double quotes have their
 * quotes stripped. Returns an empty array when the section is missing or empty.
 */
export const parseSuggestions = (markdown: string | undefined): string[] => {
  if (!markdown) {
    return [];
  }

  const lines = markdown.split('\n');
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s+suggested\s+(starting|starter)\s+prompts\b/i.test(line));
  if (headingIndex === -1) {
    return [];
  }

  const suggestions: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the next heading.
    if (/^#{1,6}\s/.test(line)) {
      break;
    }
    // Match `- item`, `* item`, `+ item`, or `1. item`.
    const match = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+?)\s*$/);
    if (match) {
      // Strip surrounding quotes if present.
      const text = match[1].replace(/^["'](.+)["']$/, '$1').trim();
      if (text.length > 0) {
        suggestions.push(text);
      }
    }
  }

  return suggestions;
};
