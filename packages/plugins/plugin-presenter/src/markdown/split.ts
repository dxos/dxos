//
// Copyright 2026 DXOS.org
//

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const SEPARATOR = /^---\s*$/;
const YAML_LINE = /^([A-Za-z_][\w-]*\s*:|\s+\S|-\s|#)/;
const YAML_KEY = /^[A-Za-z_][\w-]*\s*:/;

/** Per line: whether it is part of a fenced code block (opening fence, content or closing fence). */
export const fencedLines = (lines: string[]): boolean[] => {
  let fence: { char: string; length: number } | undefined;
  return lines.map((line) => {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        fence = undefined;
      }
      return true;
    }
    const open = line.match(FENCE_OPEN);
    if (open) {
      fence = { char: open[1][0], length: open[1].length };
      return true;
    }
    return false;
  });
};

/** Indexes of `---` lines outside fenced code. */
const findSeparators = (lines: string[]): number[] => {
  const fenced = fencedLines(lines);
  return lines.flatMap((line, index) => (!fenced[index] && SEPARATOR.test(line) ? [index] : []));
};

// Only the slot names the renderer knows, indented at most as far as markdown allows before it becomes code.
export const SLOT_LINE = /^ {0,3}::(default|left|middle|right|bottom-left|bottom-right)::\s*$/;

/**
 * Puts a blank line around every `::name::` line outside fenced code, so a marker written without blank lines
 * (as Slidev allows) becomes a paragraph of its own instead of joining its neighbours.
 */
export const isolateSlotMarkers = (markdown: string): { text: string; toSource: (offset: number) => number } => {
  const lines = markdown.split('\n');
  const fenced = fencedLines(lines);
  const output: string[] = [];
  // Offsets in `text` of the newline each inserted blank line adds.
  const inserted: number[] = [];
  let offset = 0;
  const push = (line: string, blank = false) => {
    if (blank) {
      inserted.push(offset);
    }
    output.push(line);
    offset += line.length + 1;
  };
  lines.forEach((line, index) => {
    if (!fenced[index] && SLOT_LINE.test(line)) {
      push('', true);
      push(line);
      push('', true);
    } else {
      push(line);
    }
  });
  return {
    text: output.join('\n'),
    toSource: (position) => position - inserted.filter((insertedAt) => insertedAt < position).length,
  };
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
