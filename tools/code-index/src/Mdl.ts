//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import { parse as parseYaml } from 'yaml';

/**
 * A reader for `.mdl` documents: YAML frontmatter, a markdown body with an Extensions table, and
 * typed ```` ```mdl ```` fenced blocks. A fence holds one or more blocks, each headed
 * `<type> [<id>][: <title>]` with an indented body of `key: value` fields, `- item` lists, prose,
 * and nested blocks (`req F-1.1: …` inside a `feat`). Lenient by design — it must never choke on a
 * document elsewhere in the repository, so anything it cannot classify is kept as prose.
 *
 * Belongs in `@dxos/deus` as a Node-usable subpath (the CodeMirror grammar there covers block
 * bodies only); it lives here until that export exists.
 */

/** One `key: value` entry or list item; a list item has an `index` and no `key`. */
export type Field = {
  readonly key: string | undefined;
  readonly index: number | undefined;
  /** Written `key?:` — how an `ext` declares an optional field. */
  readonly optional: boolean;
  /** The scalar text, comment stripped; continuation lines are joined with a space. */
  readonly value: string | undefined;
  /** Nested entries: a multi-line map, a `{ … }` flow map, a list, or a `[ … ]` flow list. */
  readonly fields: readonly Field[];
  /** 1-based line in the document. */
  readonly line: number;
};

export type Block = {
  readonly type: string;
  readonly id: string | undefined;
  readonly title: string | undefined;
  readonly fields: readonly Field[];
  /** Lines of the body that are neither fields nor nested blocks — the inline description. */
  readonly prose: string | undefined;
  /** Every backticked identifier-like token in the block's own lines, in order, deduplicated. */
  readonly mentions: readonly string[];
  /** The block's source below its header, dedented, nested blocks included. */
  readonly body: string;
  /** 1-based line of the block's header. */
  readonly line: number;
  /** Blocks declared inside this one (`req` inside `feat`). */
  readonly blocks: readonly Block[];
};

/** One row of the `## Extensions` table: the block type a document uses and the URI defining it. */
export type ExtensionUse = {
  readonly term: string;
  readonly uri: string;
};

export type Frontmatter = Readonly<Record<string, string | readonly string[]>>;

export type Document = {
  readonly frontmatter: Frontmatter;
  readonly extensions: readonly ExtensionUse[];
  /** Top-level blocks, in document order; nested ones hang off their parent. */
  readonly blocks: readonly Block[];
};

type Line = {
  readonly indent: number;
  readonly text: string;
  /** 1-based line in the document. */
  readonly number: number;
};

const FENCE_OPEN = /^\s*```mdl\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const FIELD = /^([A-Za-z_][\w-]*)(\?)?\s*:(?:\s+(.*)|\s*)$/;
// A nested block's header: a lowercase type, an id, and a colon (`req F-1.1: …`, `req F-2.2:`).
// The id must open with a capital or digit, so prose like `relies on: …` stays prose.
const NESTED_HEADER = /^([a-z][\w-]*)\s+([A-Z0-9][\w.-]*)\s*:(?:\s+(.*)|\s*)$/;
const ITEM = /^-(?:\s+(.*)|\s*)$/;
const MENTION = /`([A-Za-z_$][\w$.]*(?:\([^`)]*\))?)`/g;

/** Drops a trailing ` # comment`, unless the `#` sits inside quotes or backticks. */
export const stripComment = (text: string): string => {
  let quote: string | undefined;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === "'" || char === '`') {
      // An apostrophe inside a word (`plugin-comments'`) opens nothing.
      if (char !== "'" || index === 0 || /[\s([{:,]/.test(text[index - 1])) {
        quote = char;
      }
    } else if (char === '#' && (index === 0 || /\s/.test(text[index - 1]))) {
      return text.slice(0, index).trimEnd();
    }
  }
  return text.trimEnd();
};

/** Splits on top-level commas, so `{ a: Ref<A, B>, b: [x, y] }` keeps its nested groups whole. */
const splitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === '`') {
      quote = char;
    } else if ('{[(<'.includes(char)) {
      depth++;
    } else if ('}])'.includes(char) || (char === '>' && text[index - 1] !== '-' && depth > 0)) {
      depth--;
    } else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part !== '');
};

/** A `{ … }` or `[ … ]` value that closes on its own line, as nested entries; otherwise none. */
const flowEntries = (value: string, line: number): Field[] | undefined => {
  const map = value.match(/^\{(.*)\}$/s);
  if (map) {
    return splitTopLevel(map[1]).map((part): Field => {
      const entry = part.match(/^([A-Za-z_$][\w$-]*)(\?)?\s*:\s*(.*)$/s);
      const nested = entry ? flowEntries(entry[3].trim(), line) : undefined;
      return entry
        ? {
            key: entry[1],
            index: undefined,
            optional: entry[2] !== undefined,
            value: nested ? undefined : entry[3].trim() || undefined,
            fields: nested ?? [],
            line,
          }
        : {
            key: part.replace(/\?$/, ''),
            index: undefined,
            optional: part.endsWith('?'),
            value: undefined,
            fields: [],
            line,
          };
    });
  }
  const list = value.match(/^\[(.*)\]$/s);
  if (list) {
    return splitTopLevel(list[1]).map((part, index): Field => {
      const nested = flowEntries(part, line);
      return { key: undefined, index, optional: false, value: nested ? undefined : part, fields: nested ?? [], line };
    });
  }
  return undefined;
};

const toLines = (texts: readonly string[], firstNumber: number): Line[] =>
  texts.map((text, offset) => ({
    indent: text.match(/^\s*/)?.[0].length ?? 0,
    text: text.trim(),
    number: firstNumber + offset,
  }));

const isBlank = (line: Line): boolean => line.text === '';
const isComment = (line: Line): boolean => line.text.startsWith('#');

/** The lines after `lines[start]` that are indented deeper than `indent` (blank lines included). */
const childrenOf = (lines: readonly Line[], start: number, indent: number): number => {
  let end = start + 1;
  while (end < lines.length && (isBlank(lines[end]) || lines[end].indent > indent)) {
    end++;
  }
  // Trailing blank lines belong to whatever follows.
  while (end > start + 1 && isBlank(lines[end - 1])) {
    end--;
  }
  return end;
};

const dedentText = (lines: readonly Line[]): string => {
  const indents = lines.filter((line) => !isBlank(line)).map((line) => line.indent);
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => (isBlank(line) ? '' : `${' '.repeat(line.indent - min)}${line.text}`)).join('\n');
};

type Entries = { readonly fields: Field[]; readonly prose: string[] };

/**
 * Parses a run of lines into entries. A line is a field (`key: value`), a list item (`- …`), or
 * prose; whatever is indented under it is its value (`|`), its children, or its continuation.
 */
const parseEntries = (lines: readonly Line[], topLevel: boolean): Entries => {
  const fields: Field[] = [];
  const prose: string[] = [];
  let itemIndex = 0;
  let index = 0;
  // The field a flush-left prose line continues: `then: … may show the` / `TradingView embed`.
  let open: number | undefined;
  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line) || isComment(line)) {
      open = isBlank(line) ? undefined : open;
      index++;
      continue;
    }
    let end = childrenOf(lines, index, line.indent);
    const item = line.text.match(ITEM);
    const field = item ? null : line.text.match(FIELD);
    // At a block's top level a capitalised `Source: …` is prose that happens to hold a colon.
    const isField = field !== null && !(topLevel && /^[A-Z]/.test(field[1]));
    // A flow value left open (`output: {`) runs to the line that closes it, closer included.
    let raw = (isField ? field?.[3] : item?.[1]) ?? '';
    const opens = /[{[]$/.test(stripComment(raw));
    while (opens && depthOf(stripComment(raw)) > 0 && end < lines.length) {
      raw = [stripComment(raw), ...lines.slice(index + 1, end + 1).map((each) => stripComment(each.text))].join(' ');
      index = end;
      end = childrenOf(lines, index, lines[index].indent);
    }
    const children = lines.slice(index + 1, end);
    if (item) {
      fields.push(parseItem(raw, line, children, itemIndex++));
      open = undefined;
    } else if (isField && field) {
      fields.push(parseField(field[1], field[2] !== undefined, raw, line, children));
      open = fields.length - 1;
    } else {
      const text = [stripComment(line.text), ...children.filter((child) => !isBlank(child)).map((child) => child.text)];
      const previous = open === undefined ? undefined : fields[open];
      if (open !== undefined && previous?.value !== undefined && previous.fields.length === 0) {
        fields[open] = { ...previous, value: [previous.value, ...text].join(' ') };
      } else {
        prose.push(...text);
      }
    }
    index = end;
  }
  return { fields, prose };
};

/** How many `{`/`[` the text leaves unclosed, ignoring quoted text. */
const depthOf = (text: string): number => {
  let depth = 0;
  let quote: string | undefined;
  for (const char of text) {
    if (quote !== undefined) {
      quote = char === quote ? undefined : quote;
    } else if (char === '"' || char === '`') {
      quote = char;
    } else if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
    }
  }
  return depth;
};

/** A value and whatever is indented under it: a block scalar, nested entries, or continuation. */
const valueOf = (
  raw: string,
  line: Line,
  children: readonly Line[],
): { value: string | undefined; fields: Field[] } => {
  const text = stripComment(raw);
  if (/^[|>][+-]?$/.test(text)) {
    const scalar = dedentText(children).replace(/^\n+|\n+$/g, '');
    return { value: text.startsWith('>') ? scalar.replace(/\s*\n\s*/g, ' ') : scalar, fields: [] };
  }
  const nested = parseEntries(children, false);
  const continuation = nested.prose.join(' ');
  if (text !== '') {
    const flow = nested.fields.length === 0 ? flowEntries(text, line.number) : undefined;
    if (flow && continuation === '') {
      return { value: undefined, fields: flow };
    }
    return { value: [text, continuation].filter((part) => part !== '').join(' '), fields: nested.fields };
  }
  return { value: nested.prose.length === 0 ? undefined : nested.prose.join('\n'), fields: nested.fields };
};

const parseField = (key: string, optional: boolean, raw: string, line: Line, children: readonly Line[]): Field => ({
  key,
  index: undefined,
  optional,
  ...valueOf(raw, line, children),
  line: line.number,
});

/** `- text`, or `- key: value` opening a map whose other keys sit under the first. */
const parseItem = (raw: string, line: Line, children: readonly Line[], index: number): Field => {
  const field = raw.match(FIELD);
  if (field) {
    // The item's first key is on the dash line; its siblings are indented to where that key starts.
    const first: Line = { indent: line.indent + 2, text: raw, number: line.number };
    const entries = parseEntries([first, ...children], false);
    return { key: undefined, index, optional: false, value: undefined, fields: entries.fields, line: line.number };
  }
  return { key: undefined, index, optional: false, ...valueOf(raw, line, children), line: line.number };
};

const parseHeader = (text: string): { type: string; id: string | undefined; title: string | undefined } => {
  const match = text.match(/^([^:]*?)(?::\s*(.*))?$/);
  const tokens = (match?.[1] ?? text).trim().split(/\s+/);
  return { type: tokens[0] ?? '', id: tokens[1], title: match?.[2]?.trim() || undefined };
};

const mentionsOf = (texts: readonly string[]): string[] => [
  ...new Set(texts.flatMap((text) => [...text.matchAll(MENTION)].map((mention) => mention[1]))),
];

/** One block: `lines[0]` is the header, the rest its body. */
const parseBlock = (
  header: { type: string; id: string | undefined; title: string | undefined },
  lines: readonly Line[],
  line: number,
): Block => {
  const body = lines.slice(1);
  const blocks: Block[] = [];
  const own: Line[] = [];
  const indents = body.filter((each) => !isBlank(each) && !isComment(each)).map((each) => each.indent);
  const top = indents.length > 0 ? Math.min(...indents) : 0;
  let index = 0;
  while (index < body.length) {
    const candidate = body[index];
    const nested = !isBlank(candidate) && candidate.indent === top ? candidate.text.match(NESTED_HEADER) : null;
    if (nested) {
      const end = childrenOf(body, index, candidate.indent);
      blocks.push(
        parseBlock(
          { type: nested[1], id: nested[2], title: nested[3]?.trim() || undefined },
          body.slice(index, end),
          candidate.number,
        ),
      );
      index = end;
    } else {
      own.push(candidate);
      index++;
    }
  }
  const entries = parseEntries(own, true);
  // A title wrapped onto further lines (`req F-7.1: … (via\n    ExtensionProvider).`) is one title.
  const wrapped = header.title !== undefined && entries.fields.length === 0 && blocks.length === 0;
  const title = wrapped && entries.prose.length > 0 ? [header.title, ...entries.prose].join(' ') : header.title;
  return {
    ...header,
    title,
    fields: entries.fields,
    prose: !wrapped && entries.prose.length > 0 ? entries.prose.join('\n') : undefined,
    mentions: mentionsOf(own.map((each) => each.text)),
    body: dedentText(body).replace(/^\n+|\n+$/g, ''),
    line,
    blocks,
  };
};

/**
 * Splits one fence into blocks. A line at the fence's own indentation opens a new block unless it
 * reads as a field (`key: value`), which is a body written flush with its header.
 */
const parseFence = (lines: readonly Line[]): Block[] => {
  const first = lines.findIndex((line) => !isBlank(line) && !isComment(line));
  if (first === -1) {
    return [];
  }
  const base = lines[first].indent;
  const starts: number[] = [];
  for (let index = first; index < lines.length; index++) {
    const line = lines[index];
    if (isBlank(line) || isComment(line) || line.indent > base) {
      continue;
    }
    if (starts.length === 0 || !(FIELD.test(line.text) || ITEM.test(line.text))) {
      starts.push(index);
    }
  }
  return starts.map((start, position) => {
    const end = starts[position + 1] ?? lines.length;
    return parseBlock(parseHeader(lines[start].text), lines.slice(start, end), lines[start].number);
  });
};

/** The frontmatter, read as YAML, with scalars stringified; malformed YAML falls back to `key: value` lines. */
export const parseFrontmatter = (text: string): Frontmatter => {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return {};
  }
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  const source = lines.slice(1, close === -1 ? undefined : close);
  const scalar = (value: unknown): string | undefined =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : undefined;
  try {
    const parsed: unknown = parseYaml(source.join('\n'));
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, string | readonly string[]> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
          result[key] = value.flatMap((entry) => scalar(entry) ?? []);
        } else {
          const text = scalar(value);
          if (text !== undefined) {
            result[key] = text;
          }
        }
      }
      return result;
    }
  } catch {
    // Fall through to the line reader: a document with broken YAML still has an id worth keeping.
  }
  const result: Record<string, string> = {};
  for (const line of source) {
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (match) {
      result[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return result;
};

/** The rows of the table under an `Extensions` heading: `` | `type` | `org.dxos.mdl.type@1.0` | ``. */
const parseExtensions = (lines: readonly string[]): ExtensionUse[] => {
  const uses: ExtensionUse[] = [];
  let inSection = false;
  for (const line of lines) {
    const heading = line.match(/^#+\s+(.*)$/);
    if (heading) {
      inSection = /^extensions\b/i.test(heading[1].trim());
      continue;
    }
    if (!inSection) {
      continue;
    }
    const cells = line
      .trim()
      .match(/^\|(.*)\|$/)?.[1]
      .split('|')
      .map((cell) => cell.trim().replace(/^`(.*)`$/, '$1'));
    if (cells && cells.length >= 2 && /^[\w-]+$/.test(cells[0]) && cells[0] !== 'Term' && /[.@/]/.test(cells[1])) {
      uses.push({ term: cells[0], uri: cells[1] });
    }
  }
  return uses;
};

export const parse = (text: string): Document => {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  const outside: string[] = [];
  let fence: string[] | undefined;
  let openedAt = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (fence === undefined) {
      if (FENCE_OPEN.test(line)) {
        fence = [];
        openedAt = index;
      } else {
        outside.push(line);
      }
    } else if (FENCE_CLOSE.test(line)) {
      blocks.push(...parseFence(toLines(fence, openedAt + 2)));
      fence = undefined;
    } else {
      fence.push(line);
    }
  }
  return { frontmatter: parseFrontmatter(text), extensions: parseExtensions(outside), blocks };
};

/** Every block, nested ones after their parent, with the parent each hangs off. */
export const flatten = (blocks: readonly Block[], parent?: Block): { block: Block; parent: Block | undefined }[] =>
  blocks.flatMap((block) => [{ block, parent }, ...flatten(block.blocks, block)]);
