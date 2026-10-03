//
// Copyright 2026 DXOS.org
//

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
/** A closing fence carries nothing after its marker: a line with an info string only opens one. */
const CLOSING_FENCE = /^\s{0,3}(`{3,}|~{3,})[ \t]*$/;
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
    // Split on `\n` alone, so a CRLF line keeps its `\r`: matched without it, written back with it.
    const crlf = line.endsWith('\r');
    const text = crlf ? line.slice(0, -1) : line;
    const marker = text.match(FENCE)?.[1];
    if (fence) {
      const closer = text.match(CLOSING_FENCE)?.[1];
      if (closer && closer[0] === fence[0] && closer.length >= fence.length) {
        fence = undefined;
      }
    } else if (marker) {
      fence = marker;
    } else if (HEADING.test(text) && result.length > 0 && result[result.length - 1].trim() !== '') {
      result.push(crlf ? '\r' : '');
    }
    result.push(line);
  }

  return result.join('\n');
};
