//
// Copyright 2026 DXOS.org
//

import { scanFenceLines } from '../extension/blocks.ts';

/** A text range; `to` is exclusive. */
export type Range = { from: number; to: number };

/** One line of a block, without its newline. */
export type SourceLine = Range & { text: string; indent: number };

/**
 * One top-level field of a block body, with the source range of every part a codec reads or rewrites.
 * Offsets are into the whole spec text.
 */
export type SourceField = Range & {
  name: string;
  /** `name?:`, as a `FieldMap` row writes an optional field. */
  optional: boolean;
  /** For a keyed line (`req <key>: prose`), the key. */
  key?: string;
  /** The key's range, for a keyed line. */
  keyRange?: Range;
  /** The text after the colon on the field's own line, trimmed; empty when the value is on the lines below. */
  inline: SourceLine;
  /** A block-scalar indicator (`|`, `>`) that stands for the inline value. */
  indicator?: string;
  /** The lines below the field's own line that belong to it; interior blank lines included. */
  lines: SourceLine[];
};

/** One `mdl` block: its header and body, parsed with source ranges. */
export type SourceBlock = Range & {
  /** The whole fence, opening and closing lines included. */
  fence: Range;
  kind: string;
  /** Empty for a block with no identifier. */
  id: string;
  title?: string;
  header: SourceLine & { kind: Range; id?: Range; title?: Range };
  /** The body's field indent. */
  indent: number;
  /** Lines at the field indent that are not fields, in order: a kind's inline prose. */
  prose: SourceLine[];
  fields: SourceField[];
};

export type ParseOptions = {
  /** Per block kind, the field names that are keyed lines (`req`). */
  keyed?: (kind: string) => ReadonlySet<string>;
};

const FIELD = /^([A-Za-z][\w-]*)(\?)?:(?=\s|$)[ \t]*(.*)$/;
const HEADER = /^(\w+)(?:([ \t]+)([^\s:][^\n:]*?))?[ \t]*(?::[ \t]*(.*?))?[ \t]*$/;
const INDICATOR = /^[|>][-+]?$/;

const lineAt = (text: string, from: number, to: number): SourceLine => {
  const line = text.slice(from, to);
  return { from, to, text: line, indent: line.length - line.trimStart().length };
};

/** The line's text after its indent, as a range. */
const trimmed = (line: SourceLine): SourceLine => {
  const text = line.text.trim();
  const from = line.from + line.indent;
  return { from, to: from + text.length, text, indent: 0 };
};

/**
 * Parses the block whose header line starts at `from` and whose body ends at `to` (the start of the
 * closing fence line, or the end of the text). Every range is into `text`.
 */
export const parseSourceBlock = (
  text: string,
  { from, to, fence }: Range & { fence: Range },
  options: ParseOptions = {},
): SourceBlock => {
  const lines: SourceLine[] = [];
  for (let offset = from; offset < to;) {
    const end = text.indexOf('\n', offset);
    const lineEnd = end === -1 || end > to ? to : end;
    lines.push(lineAt(text, offset, lineEnd));
    offset = lineEnd + 1;
  }
  // A body that ends with the text has no closing newline to drop.
  while (lines.length > 1 && lines[lines.length - 1].text === '' && lines[lines.length - 1].to >= to) {
    lines.pop();
  }

  const [headerLine, ...body] = lines;
  const head = trimmed(headerLine ?? lineAt(text, from, from));
  const match = head.text.match(HEADER);
  const kind = match?.[1] ?? '';
  const id = match?.[3]?.trim() ?? '';
  const title = match?.[4] || undefined;
  const idFrom = head.from + kind.length + (match?.[2]?.length ?? 0);
  const titleFrom = title === undefined ? -1 : head.from + head.text.lastIndexOf(title);
  const header: SourceBlock['header'] = {
    ...head,
    kind: { from: head.from, to: head.from + kind.length },
    ...(id && { id: { from: idFrom, to: idFrom + id.length } }),
    ...(title !== undefined && { title: { from: titleFrom, to: titleFrom + title.length } }),
  };

  const contentIndents = body.filter((line) => line.text.trim() !== '').map((line) => line.indent);
  const indent = contentIndents.length > 0 ? Math.min(...contentIndents) : 2;
  const keyed = options.keyed?.(kind) ?? new Set<string>();
  const keyedLine =
    keyed.size > 0 ? new RegExp(`^(${[...keyed].join('|')})[ \\t]+([^\\s:]+)[ \\t]*:(?=\\s|$)[ \\t]*(.*)$`) : undefined;

  const prose: SourceLine[] = [];
  const fields: SourceField[] = [];
  let current: SourceField | undefined;
  let pending: SourceLine[] = [];
  const close = () => {
    if (current) {
      const last = current.lines.at(-1);
      current.to = last ? last.to : current.inline.to || current.to;
    }
  };
  for (const line of body) {
    if (line.text.trim() === '') {
      pending.push(line);
      continue;
    }
    const content = trimmed(line);
    const atBase = line.indent === indent;
    const keyedMatch = atBase ? keyedLine && content.text.match(keyedLine) : undefined;
    const fieldMatch = atBase && !keyedMatch ? content.text.match(FIELD) : undefined;
    if (keyedMatch || fieldMatch) {
      close();
      pending = [];
      const value = (keyedMatch ? keyedMatch[3] : fieldMatch![3]).trim();
      const valueFrom = value ? content.from + content.text.lastIndexOf(value) : content.to;
      const inline = { from: valueFrom, to: valueFrom + value.length, text: value, indent: 0 };
      const keyFrom = keyedMatch ? content.from + content.text.indexOf(keyedMatch[2], keyedMatch[1].length) : 0;
      current = {
        from: content.from,
        to: content.to,
        name: keyedMatch ? keyedMatch[1] : fieldMatch![1],
        optional: Boolean(fieldMatch?.[2]),
        ...(keyedMatch && { key: keyedMatch[2], keyRange: { from: keyFrom, to: keyFrom + keyedMatch[2].length } }),
        inline: INDICATOR.test(value) ? { ...inline, from: inline.to, text: '' } : inline,
        ...(INDICATOR.test(value) && { indicator: value }),
        lines: [],
      };
      fields.push(current);
    } else if (current && line.indent > indent) {
      current.lines.push(...pending, line);
      pending = [];
    } else {
      close();
      current = undefined;
      pending = [];
      prose.push(line);
    }
  }
  close();

  const last = body.findLast((line) => line.text.trim() !== '');
  return {
    from,
    to: last ? last.to : headerLine ? headerLine.to : from,
    fence,
    kind,
    id,
    ...(title !== undefined && { title }),
    header,
    indent,
    prose,
    fields,
  };
};

/** The ranges of every top-level `mdl` fence: the fence itself and its block's lines. */
export const scanBlocks = (text: string): (Range & { fence: Range })[] => {
  const blocks: (Range & { fence: Range })[] = [];
  let open: { fenceFrom: number; from: number } | undefined;
  scanFenceLines(text, ({ line, offset, kind, mdl }) => {
    if (kind === 'open' && mdl) {
      open = { fenceFrom: offset, from: offset + line.length + 1 };
    } else if (kind === 'close' && mdl && open) {
      blocks.push({ from: open.from, to: offset, fence: { from: open.fenceFrom, to: offset + line.length } });
      open = undefined;
    }
  });
  if (open && open.from <= text.length) {
    blocks.push({ from: open.from, to: text.length, fence: { from: open.fenceFrom, to: text.length } });
  }
  return blocks;
};

/** Every `mdl` block of a spec text, parsed with source ranges, in document order. */
export const parseSourceBlocks = (text: string, options?: ParseOptions): SourceBlock[] =>
  scanBlocks(text).map((range) => parseSourceBlock(text, range, options));
