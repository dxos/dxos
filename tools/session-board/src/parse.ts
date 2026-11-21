//
// Copyright 2026 DXOS.org
//

import {
  BOARD_FORMAT,
  type BoardData,
  type Detail,
  type Item,
  type Section,
  SECTION_KINDS,
  type SectionKind,
  type Span,
  STATES,
} from './types.ts';

/** Word budgets that keep the board terse; the parser rejects text over them. */
export const LIMITS = {
  summaryWords: 12,
  detailWords: 25,
  details: 6,
  subDetails: 4,
  titleWords: 8,
};

export type Problem = { line: number; message: string };

/** A line of board text with the source line it came from, for checks that run after parsing. */
export type Sentence = { line: number; text: string };

export type ParseResult = {
  board?: BoardData;
  errors: Problem[];
  sentences: Sentence[];
};

export type ParseOptions = { updated?: string; branch?: string; source?: string };

const STATE_ALIASES: Record<string, string> = { 'x': 'done', ' ': 'todo', '': 'todo' };

const GITHUB_REF = /^([\w.-]+\/[\w.-]+)#(\d+)/;
const URL = /^https?:\/\/[^\s)]+/;

/** Splits inline Markdown into spans: `code`, **bold**, [links](url), bare URLs and `owner/repo#123` PR references. */
export const parseInline = (text: string): Span[] => {
  const spans: Span[] = [];
  let plain = '';
  const flush = () => {
    if (plain) {
      spans.push({ text: plain });
      plain = '';
    }
  };
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const atWordStart = index === 0 || /\s|\(/.test(text[index - 1]);
    const code = rest.match(/^`([^`]+)`/);
    const strong = rest.match(/^\*\*([^*]+)\*\*/);
    const link = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
    const url = atWordStart ? rest.match(URL) : null;
    const ref = atWordStart ? rest.match(GITHUB_REF) : null;
    if (code) {
      flush();
      spans.push({ text: code[1], code: true });
      index += code[0].length;
    } else if (strong) {
      flush();
      spans.push({ text: strong[1], strong: true });
      index += strong[0].length;
    } else if (link) {
      flush();
      const inner = link[1].match(/^`([^`]+)`$/);
      spans.push({ text: inner ? inner[1] : link[1], href: link[2], ...(inner ? { code: true } : {}) });
      index += link[0].length;
    } else if (url) {
      flush();
      // Trailing sentence punctuation belongs to the sentence, not the URL.
      const href = url[0].replace(/[.,;:]+$/, '');
      spans.push({ text: href.replace(/^https?:\/\//, ''), href });
      index += href.length;
    } else if (ref) {
      flush();
      spans.push({ text: ref[0], href: `https://github.com/${ref[1]}/pull/${ref[2]}` });
      index += ref[0].length;
    } else {
      plain += text[index];
      index += 1;
    }
  }
  flush();
  return spans;
};

/** Words a reader reads: a code span or a link counts as one. */
const countWords = (spans: Span[]): number =>
  spans.reduce(
    (count, span) =>
      count + (span.code || span.href ? 1 : span.text.split(/\s+/).filter((word) => /\w/.test(word)).length),
    0,
  );

/** The prose of a line with code and links taken out, which is all the STE check can judge. */
const proseOf = (spans: Span[]): string =>
  spans
    .map((span) => (span.code || span.href ? 'X' : span.text))
    .join('')
    .trim();

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

type Bullet = { depth: number; text: string; line: number };

/**
 * Parses a session board's Markdown. The format:
 *
 * ```md
 * # Title
 * One-line summary.
 *
 * ## Goals
 * - [done] One terse line.
 *   - A detail bullet.
 *     - A sub-detail.
 * ```
 *
 * Every `##` heading is a section; `Questions`, `Goals` and `Pull requests` take the states in `STATES`.
 */
export const parseBoard = (markdown: string, options: ParseOptions = {}): ParseResult => {
  const errors: Problem[] = [];
  const sentences: Sentence[] = [];
  const error = (line: number, message: string) => errors.push({ line, message });

  let title: string | undefined;
  let summary: Span[] | undefined;
  const sections: Section[] = [];
  let section: Section | undefined;
  let bullets: Bullet[] = [];

  const closeSection = () => {
    if (section) {
      section.items = buildItems(section, bullets, error, sentences);
      sections.push(section);
    }
    bullets = [];
  };

  const lines = markdown.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, '')).split('\n');
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) {
      return;
    }
    const heading = raw.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (heading) {
      if (heading[1] === '#') {
        if (title !== undefined) {
          error(line, 'only one `#` title is allowed');
        }
        title = heading[2];
        if (title.split(/\s+/).length > LIMITS.titleWords) {
          error(line, `the title has more than ${LIMITS.titleWords} words`);
        }
      } else if (heading[1] === '##') {
        closeSection();
        const name = heading[2];
        const kind: SectionKind = SECTION_KINDS[name.toLowerCase()] ?? 'list';
        const id = slug(name);
        if (sections.some((existing) => existing.id === id)) {
          error(line, `the section "${name}" occurs two times`);
        }
        section = { id, title: name, kind, items: [] };
      } else {
        error(line, 'use only `#` for the title and `##` for sections');
      }
      return;
    }

    const bullet = raw.match(/^( *)[-*]\s+(.*)$/);
    if (bullet) {
      if (!section) {
        error(line, 'a list item must be in a `##` section');
        return;
      }
      const indent = bullet[1].length;
      if (indent % 2 !== 0 || indent > 4) {
        error(line, 'indent list items by 0, 2 or 4 spaces');
        return;
      }
      bullets.push({ depth: indent / 2, text: bullet[2].trim(), line });
      return;
    }

    // An indented line without a marker continues the bullet above it.
    if (/^\s+\S/.test(raw) && bullets.length > 0) {
      bullets[bullets.length - 1].text += ` ${raw.trim()}`;
      return;
    }

    if (title !== undefined && !section && summary === undefined) {
      summary = parseInline(raw.trim());
      if (countWords(summary) > LIMITS.detailWords) {
        error(line, `the summary has more than ${LIMITS.detailWords} words`);
      }
      sentences.push({ line, text: proseOf(summary) });
      return;
    }
    error(line, 'text must be a list item; write one line under the title as the summary');
  });
  closeSection();

  if (title === undefined) {
    error(1, 'the file has no `#` title');
  }
  if (sections.length === 0) {
    error(1, 'the file has no `##` sections');
  }
  if (errors.length > 0 || title === undefined) {
    return { errors, sentences };
  }

  return {
    errors,
    sentences,
    board: {
      format: BOARD_FORMAT,
      title,
      ...(summary ? { summary } : {}),
      updated: options.updated ?? new Date().toISOString(),
      ...(options.branch ? { branch: options.branch } : {}),
      ...(options.source ? { source: options.source } : {}),
      sections,
    },
  };
};

const buildItems = (
  section: Section,
  bullets: Bullet[],
  error: (line: number, message: string) => void,
  sentences: Sentence[],
): Item[] => {
  const items: Item[] = [];
  const states = STATES[section.kind];
  for (const bullet of bullets) {
    const spans = (text: string, limit: number) => {
      const result = parseInline(text);
      const words = countWords(result);
      if (words > limit) {
        error(bullet.line, `${words} words; the limit is ${limit}`);
      }
      sentences.push({ line: bullet.line, text: proseOf(result) });
      return result;
    };

    if (bullet.depth === 0) {
      const marker = bullet.text.match(/^\[([^\]]*)\]\s*(.*)$/);
      const state = marker ? (STATE_ALIASES[marker[1]] ?? marker[1].trim().toLowerCase()) : undefined;
      const text = marker ? marker[2] : bullet.text;
      if (state === undefined && section.kind !== 'list') {
        error(bullet.line, `start the item with a state: ${Object.keys(states).join(', ')}`);
      } else if (state !== undefined && !states[state]) {
        error(bullet.line, `"${state}" is not a state of "${section.title}"; use ${Object.keys(states).join(', ')}`);
      }
      if (!text) {
        error(bullet.line, 'the item has no text');
      }
      const item: Item = { ...(state ? { state } : {}), spans: spans(text, LIMITS.summaryWords), details: [] };
      items.push(item);
      continue;
    }

    const item = items[items.length - 1];
    if (!item) {
      error(bullet.line, 'a detail must follow an item');
      continue;
    }
    const detail: Detail = { spans: spans(bullet.text, LIMITS.detailWords) };
    if (bullet.depth === 1) {
      item.details.push(detail);
      if (item.details.length === LIMITS.details + 1) {
        error(bullet.line, `an item has more than ${LIMITS.details} details`);
      }
    } else {
      const parent = item.details[item.details.length - 1];
      if (!parent) {
        error(bullet.line, 'a sub-detail must follow a detail');
        continue;
      }
      parent.children = [...(parent.children ?? []), detail];
      if (parent.children.length === LIMITS.subDetails + 1) {
        error(bullet.line, `a detail has more than ${LIMITS.subDetails} sub-details`);
      }
    }
  }
  return items;
};
