//
// Copyright 2026 DXOS.org
//

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const SEPARATOR = /^---\s*$/;
const YAML_LINE = /^([A-Za-z_][\w-]*\s*:|\s+\S|-\s|#)/;
const YAML_KEY = /^[A-Za-z_][\w-]*\s*:/;

/** Indexes of `---` lines outside fenced code. */
const findSeparators = (lines: string[]): number[] => {
  const separators: number[] = [];
  let fence: { char: string; length: number } | undefined;
  lines.forEach((line, index) => {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        fence = undefined;
      }
      return;
    }
    const open = line.match(FENCE_OPEN);
    if (open) {
      fence = { char: open[1][0], length: open[1].length };
    } else if (SEPARATOR.test(line)) {
      separators.push(index);
    }
  });
  return separators;
};

/** True when the lines between two separators read as a YAML mapping. */
const isFrontmatter = (lines: string[]): boolean => {
  // Markdown formatters insert a blank line after the opening `---`.
  const first = lines.findIndex((line) => line.trim() !== '');
  return first >= 0 && YAML_KEY.test(lines[first]) && lines.every((line) => line.trim() === '' || YAML_LINE.test(line));
};

/**
 * Splits a markdown document into slides using the Slidev rule: a `---` line separates slides, and a
 * `---` directly followed by YAML and a closing `---` opens that slide's frontmatter (kept with the slide).
 * Fenced code is never split.
 */
export const splitSlides = (markdown: string): string[] => {
  const lines = markdown.split('\n');
  const separators = findSeparators(lines);
  const slides: string[] = [];
  let start = 0;
  // Index of the first line after the current slide's frontmatter, or after the last separator.
  let bodyStart = 0;
  let hasFrontmatter = false;

  const flush = (end: number) => {
    slides.push(lines.slice(start, end).join('\n').trim());
  };

  let cursor = 0;
  while (cursor < separators.length) {
    const separator = separators[cursor];
    const closing = separators[cursor + 1];
    const opensFrontmatter = closing !== undefined && isFrontmatter(lines.slice(separator + 1, closing));
    if (opensFrontmatter) {
      if (hasFrontmatter || separator > bodyStart || slides.length > 0) {
        flush(separator);
      }
      hasFrontmatter = true;
      start = separator;
      bodyStart = closing + 1;
      cursor += 2;
    } else {
      hasFrontmatter = false;
      if (separator === 0) {
        start = 1;
      } else {
        flush(separator);
        start = separator + 1;
      }
      bodyStart = separator + 1;
      cursor += 1;
    }
  }
  flush(lines.length);
  return slides;
};
