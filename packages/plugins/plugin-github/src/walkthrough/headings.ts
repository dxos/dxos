//
// Copyright 2026 DXOS.org
//

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^\s{0,3}#{1,6}(\s|$)/;

/**
 * Puts a blank line before every heading outside a code fence.
 *
 * A heading may legally interrupt a paragraph, so the model and the chapter join both emit one on
 * the very next line — which the walkthrough's source-level editor shows flush against the prose.
 */
export const spaceHeadings = (markdown: string): string => {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let fence: string | undefined;
  for (const line of lines) {
    const marker = line.match(FENCE)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
    } else if (marker) {
      fence = marker;
    } else if (HEADING.test(line) && result.length > 0 && result[result.length - 1].trim() !== '') {
      result.push('');
    }
    result.push(line);
  }

  return result.join('\n');
};
