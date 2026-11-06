//
// Copyright 2026 DXOS.org
//

import { keyedFields } from './dialects.ts';
import { type SourceBlock, type SourceField, type SourceLine, parseSourceBlocks } from './source.ts';
import { type Change, applyChanges, minimalChange, paragraphs, reprose, wrap } from './text.ts';
import { type BlockSchema, type FieldSchema } from './types.ts';

/** One row of a map field: `name[?]: value  # note`. */
export type Row = { name: string; optional: boolean; value: string; note?: string };

/** One keyed line: `req <key>: text`. */
export type Entry = { key: string; text: string };

export type FieldValue = string | readonly string[] | readonly Row[] | readonly Entry[];

/** A block as a form edits it. */
export type BlockValue = {
  title?: string;
  /** The inline prose under the header, for a kind that takes it. */
  prose?: string;
  fields: Readonly<Record<string, FieldValue | undefined>>;
  /** Fields whose source no codec reads; their value is the source text, edited verbatim. */
  raw: readonly string[];
};

const WIDTH = 100;

const ROW = /^([\w-]+|"[^"]*")(\?)?:[ \t]*(.*?)(?:([ \t]+)#[ \t]*(.*?))?[ \t]*$/d;
const COMMENT = /^#/;
const TRAILING_COMMENT = /[ \t]+#.*$/;

type Codec = 'text' | 'scalar' | 'list' | 'rows' | 'entries' | 'raw';

const codecOf = ({ type }: FieldSchema): Codec => {
  switch (type.kind) {
    case 'prose':
      return 'text';
    case 'identifier':
    case 'uri':
    case 'boolean':
    case 'number':
    case 'literal':
    case 'typeExpr':
      return 'scalar';
    case 'ref':
      return type.many ? 'list' : 'scalar';
    case 'list':
      return 'list';
    case 'map':
      return 'rows';
    case 'keyed':
      return 'entries';
    default:
      return 'raw';
  }
};

const isEmpty = (value: FieldValue | undefined) =>
  value === undefined || (typeof value === 'string' ? value.trim() === '' : value.length === 0);

/** Lines with their common indent removed. */
const dedent = (lines: readonly SourceLine[]): string[] => {
  const indents = lines.filter((line) => line.text.trim()).map((line) => line.indent);
  const common = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.text.slice(common).trimEnd());
};

/** The source range a field's value occupies: from its inline value, or its first line, to its end. */
const valueRange = (field: SourceField) => ({
  from: field.inline.text || field.lines.length === 0 ? field.inline.from : field.lines[0].from + field.lines[0].indent,
  to: field.to,
});

//
// Decode.
//

const decodeText = (field: SourceField): string => {
  if (field.indicator?.startsWith('|')) {
    return dedent(field.lines).join('\n').trim();
  }
  return paragraphs([field.inline.text, ...field.lines.map((line) => line.text)].join('\n')).join('\n\n');
};

const decodeScalar = (field: SourceField): string =>
  field.inline.text
    ? field.inline.text.replace(TRAILING_COMMENT, '')
    : field.lines
        .map((line) => line.text.trim())
        .join(' ')
        .trim();

/** Splits on commas outside brackets, braces, parentheses and backticks. */
const splitTop = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let tick = false;
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '`') {
      tick = !tick;
    } else if (!tick && '[{(<'.includes(char)) {
      depth++;
    } else if (!tick && ']})>'.includes(char)) {
      depth--;
    } else if (!tick && depth === 0 && char === ',') {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
};

/** A list's items with the source range of each, in the style it is written. */
type ListSource =
  | { style: 'flow' | 'inline'; items: string[] }
  | { style: 'bullets'; items: { text: string; from: number; to: number }[] }
  | { style: 'none'; items: [] };

const listSource = (field: SourceField): ListSource | undefined => {
  const inline = field.inline.text.replace(TRAILING_COMMENT, '');
  if (inline && field.lines.length === 0) {
    const flow = inline.match(/^\[(.*)\]$/);
    return flow ? { style: 'flow', items: splitTop(flow[1]) } : { style: 'inline', items: splitTop(inline) };
  }
  if (!inline && field.lines.length === 0) {
    return { style: 'none', items: [] };
  }
  if (inline) {
    return undefined;
  }
  const items: { text: string; from: number; to: number }[] = [];
  for (const line of field.lines) {
    const text = line.text.trim();
    if (!text || COMMENT.test(text)) {
      continue;
    }
    const bullet = text.match(/^-[ \t]+(.*)$/);
    if (bullet) {
      items.push({ text: bullet[1], from: line.from + line.indent, to: line.to });
    } else if (items.length > 0) {
      const last = items[items.length - 1];
      last.text = `${last.text} ${text}`;
      last.to = line.to;
    } else {
      return undefined;
    }
  }
  return { style: 'bullets', items };
};

const parseRow = (text: string): Row | undefined => {
  const row = text.match(ROW);
  return row ? { name: row[1], optional: Boolean(row[2]), value: row[3], ...(row[5] && { note: row[5] }) } : undefined;
};

/** Where a row's note starts (its `#`), within the row's text; -1 for a row with none. */
const noteColumn = (text: string): number => {
  const row = ROW.exec(text);
  return row?.indices?.[4] ? row.indices[4][1] : -1;
};

/** A map's rows with the line each is on, or the flow map it is written as. */
type RowsSource =
  | { style: 'lines'; rows: { row: Row; line: SourceLine }[] }
  | { style: 'flow'; rows: { row: Row }[] }
  | { style: 'none'; rows: [] };

const rowsSource = (field: SourceField): RowsSource | undefined => {
  const inline = field.inline.text;
  if (inline) {
    const flow = inline.match(/^\{(.*)\}$/);
    if (!flow || field.lines.length > 0) {
      return undefined;
    }
    const rows = splitTop(flow[1]).map((part) =>
      /^[\w-]+\??$/.test(part)
        ? { name: part.replace(/\?$/, ''), optional: part.endsWith('?'), value: '' }
        : parseRow(part),
    );
    return rows.every(Boolean) ? { style: 'flow', rows: rows.map((row) => ({ row: row! })) } : undefined;
  }
  if (field.lines.length === 0) {
    return { style: 'none', rows: [] };
  }
  const rows: { row: Row; line: SourceLine }[] = [];
  for (const line of field.lines) {
    const text = line.text.trim();
    if (!text || COMMENT.test(text)) {
      continue;
    }
    const row = parseRow(text);
    if (!row) {
      return undefined;
    }
    rows.push({ row, line });
  }
  return { style: 'lines', rows };
};

const fieldsNamed = (block: SourceBlock, name: string) => block.fields.filter((field) => field.name === name);

/** The source text of a field's value, as a raw field edits it. */
const rawSource = (text: string, field: SourceField): string => {
  if (field.lines.length === 0) {
    return field.inline.text;
  }
  const lines = dedent(field.lines);
  return field.inline.text ? [field.inline.text, ...lines].join('\n') : lines.join('\n');
};

/** Decodes one field; `undefined` when the field's source is not in a form its codec reads. */
const decodeField = (
  text: string,
  block: SourceBlock,
  field: FieldSchema,
): { value: FieldValue | undefined } | undefined => {
  const codec = codecOf(field);
  if (codec === 'entries') {
    return {
      value: fieldsNamed(block, field.name).map((entry) => ({ key: entry.key ?? '', text: decodeText(entry) })),
    };
  }
  const source = block.fields.find((candidate) => candidate.name === field.name && candidate.key === undefined);
  if (!source) {
    return { value: undefined };
  }
  switch (codec) {
    case 'text':
      return { value: decodeText(source) };
    case 'scalar':
      return { value: decodeScalar(source) };
    case 'list': {
      const list = listSource(source);
      return list && { value: list.items.map((item) => (typeof item === 'string' ? item : item.text)) };
    }
    case 'rows': {
      const rows = rowsSource(source);
      return rows && { value: rows.rows.map(({ row }) => row) };
    }
    default:
      return { value: rawSource(text, source) };
  }
};

/** The block's inline prose: its prose lines before the first field. */
const proseLines = (block: SourceBlock): SourceLine[] => {
  const first = block.fields[0]?.from ?? Infinity;
  return block.prose.filter((line) => line.from < first);
};

/** The block as a form's value. Fields not in the schema are left out; the patch keeps them. */
export const decodeBlock = (text: string, block: SourceBlock, schema: BlockSchema): BlockValue => {
  const fields: Record<string, FieldValue | undefined> = {};
  const raw: string[] = [];
  for (const field of schema.fields) {
    const decoded = decodeField(text, block, field);
    if (decoded) {
      fields[field.name] = decoded.value;
    } else {
      const source = block.fields.find((candidate) => candidate.name === field.name);
      fields[field.name] = source && rawSource(text, source);
      raw.push(field.name);
    }
  }
  const prose = schema.inlineProse
    ? paragraphs(
        proseLines(block)
          .map((line) => line.text)
          .join('\n'),
      ).join('\n\n')
    : '';
  return { ...(block.title !== undefined && { title: block.title }), ...(prose && { prose }), fields, raw };
};

//
// Encode.
//

const pad = (count: number) => ' '.repeat(count);

/** The start of the line holding `offset`. */
const lineStart = (text: string, offset: number) => text.lastIndexOf('\n', offset - 1) + 1;

/** Prose written over a source range of paragraphs, each paragraph rewrapped against its old lines. */
const reproseRange = (text: string, from: number, to: number, next: string, indent: string): string => {
  const source = text.slice(from, to);
  const column = from - lineStart(text, from);
  const oldParagraphs = source.split(/\n[ \t]*\n/);
  const separators = source.match(/\n[ \t]*\n/g) ?? [];
  const nextParagraphs = next.split(/\n[ \t]*\n/).filter((paragraph) => paragraph.trim());
  return nextParagraphs
    .map((paragraph, index) => {
      const old = oldParagraphs[index];
      if (old === undefined) {
        return wrap(paragraph, { width: WIDTH, first: indent, indent }).join('\n');
      }
      return reprose(old, paragraph, { column: index === 0 ? column : 0, indent });
    })
    .reduce(
      (out, paragraph, index) => (index === 0 ? paragraph : `${out}${separators[index - 1] ?? '\n\n'}${paragraph}`),
      '',
    );
};

/** A prose value printed after `first` (`desc: `), wrapped with continuation lines at `indent`. */
const printProse = (value: string, first: string, indent: string): string =>
  paragraphs(value)
    .map((paragraph, index) =>
      wrap(paragraph, { width: WIDTH, first: index === 0 ? first : indent, indent }).join('\n'),
    )
    .join('\n\n');

const printRow = ({ name, optional, value, note }: Row) =>
  `${name}${optional ? '?' : ''}:${value ? ` ${value}` : ''}${note ? `  # ${note}` : ''}`;

const sameRow = (a: Row | undefined, b: Row | undefined) =>
  a?.name === b?.name && a?.optional === b?.optional && a?.value === b?.value && a?.note === b?.note;

/** A field written from scratch, starting at its indent. */
const printField = (field: FieldSchema, value: FieldValue, indent: string): string => {
  const name = `${indent}${field.name}:`;
  const deeper = `${indent}  `;
  switch (codecOf(field)) {
    case 'text':
      return printProse(value as string, `${name} `, deeper);
    case 'list':
      return `${name} [${(value as readonly string[]).join(', ')}]`;
    case 'rows':
      return [name, ...(value as readonly Row[]).map((row) => `${deeper}${printRow(row)}`)].join('\n');
    case 'entries':
      return (value as readonly Entry[])
        .map(({ key, text }) => printProse(text, `${indent}${field.name} ${key}: `, deeper))
        .join('\n');
    case 'raw': {
      const lines = (value as string).split('\n');
      return lines.length === 1 ? `${name} ${lines[0]}` : [name, ...lines.map((line) => `${deeper}${line}`)].join('\n');
    }
    default:
      return `${name} ${value as string}`;
  }
};

/** Changes that delete a field: its lines, with the newline before them. */
const deleteField = (text: string, field: SourceField): Change => {
  const start = lineStart(text, field.from);
  return { from: Math.max(0, start - 1), to: field.to, insert: '' };
};

/** Where a new field goes: after the last present field the schema orders before it, else before the first after it. */
const insertField = (
  text: string,
  block: SourceBlock,
  schema: BlockSchema,
  field: FieldSchema,
  printed: string,
): Change => {
  const order = schema.fields.map(({ name }) => name);
  const position = order.indexOf(field.name);
  const before = block.fields.filter((candidate) => {
    const index = order.indexOf(candidate.name);
    return index !== -1 && index < position;
  });
  const after = block.fields.find((candidate) => order.indexOf(candidate.name) > position);
  if (before.length > 0) {
    const anchor = before[before.length - 1];
    return { from: anchor.to, to: anchor.to, insert: `\n${printed}` };
  }
  if (after) {
    const start = lineStart(text, after.from);
    return { from: start, to: start, insert: `${printed}\n` };
  }
  const last = Math.max(block.header.to, ...block.prose.map((line) => line.to), ...block.fields.map(({ to }) => to));
  return { from: last, to: last, insert: `\n${printed}` };
};

const patchText = (text: string, field: SourceField, next: string, indent: string): Change[] => {
  if (field.indicator?.startsWith('|')) {
    const lines = next.split('\n').map((line) => (line ? `${indent}${line}` : line));
    if (field.lines.length === 0) {
      return [{ from: field.to, to: field.to, insert: `\n${lines.join('\n')}` }];
    }
    const from = field.lines[0].from;
    const change = minimalChange(from, text.slice(from, field.to), lines.join('\n'));
    return change ? [change] : [];
  }
  const { from, to } = valueRange(field);
  if (from === to) {
    return [{ from, to, insert: printProse(next, ' ', indent) }];
  }
  const change = minimalChange(from, text.slice(from, to), reproseRange(text, from, to, next, indent));
  return change ? [change] : [];
};

const patchScalar = (text: string, field: SourceField, next: string): Change[] => {
  if (field.inline.text || field.lines.length === 0) {
    const value = field.inline.text.replace(TRAILING_COMMENT, '');
    const change = minimalChange(field.inline.from, value, next);
    return change ? [change] : [];
  }
  return [{ from: field.inline.from, to: field.to, insert: ` ${next}` }];
};

const patchList = (text: string, field: SourceField, next: readonly string[], indent: string): Change[] | undefined => {
  const list = listSource(field);
  if (!list) {
    return undefined;
  }
  switch (list.style) {
    case 'flow':
    case 'inline': {
      const value = field.inline.text.replace(TRAILING_COMMENT, '');
      const printed = list.style === 'flow' ? `[${next.join(', ')}]` : next.join(', ');
      const change = minimalChange(field.inline.from, value, printed);
      return change ? [change] : [];
    }
    case 'none':
      return [{ from: field.inline.from, to: field.inline.to, insert: ` [${next.join(', ')}]` }];
    case 'bullets': {
      const lead = list.items[0] ? pad(list.items[0].from - lineStart(text, list.items[0].from)) : indent;
      const changes: Change[] = [];
      list.items.forEach((item, index) => {
        if (index >= next.length) {
          changes.push({ from: lineStart(text, item.from) - 1, to: item.to, insert: '' });
        } else if (next[index] !== item.text) {
          changes.push({ from: item.from, to: item.to, insert: `- ${next[index]}` });
        }
      });
      const end = list.items.at(-1)?.to ?? field.to;
      const added = next.slice(list.items.length).map((item) => `\n${lead}- ${item}`);
      if (added.length > 0) {
        changes.push({ from: end, to: end, insert: added.join('') });
      }
      return changes;
    }
  }
};

const patchRows = (text: string, field: SourceField, next: readonly Row[], indent: string): Change[] | undefined => {
  const source = rowsSource(field);
  if (!source) {
    return undefined;
  }
  if (source.style === 'flow') {
    const printed = `{ ${next.map((row) => (row.value ? printRow({ ...row, note: undefined }) : `${row.name}${row.optional ? '?' : ''}`)).join(', ')} }`;
    const change = minimalChange(field.inline.from, field.inline.text, printed);
    return change ? [change] : [];
  }
  if (source.style === 'none') {
    return next.length === 0
      ? []
      : [{ from: field.to, to: field.to, insert: next.map((row) => `\n${indent}${printRow(row)}`).join('') }];
  }
  const changes: Change[] = [];
  source.rows.forEach(({ row, line }, index) => {
    const nextRow = next[index];
    const from = line.from + line.indent;
    if (!nextRow) {
      changes.push({ from: lineStart(text, line.from) - 1, to: line.to, insert: '' });
      return;
    }
    if (sameRow(row, nextRow)) {
      return;
    }
    // A note keeps its column: the gap before it absorbs the change in length.
    const noteAt = row.note === undefined ? -1 : line.indent + noteColumn(line.text.trim());
    if (noteAt !== -1 && nextRow.note === row.note) {
      const head = printRow({ ...nextRow, note: undefined });
      const column = line.indent + head.length;
      const gap = Math.max(2, noteAt - column);
      changes.push(
        ...[minimalChange(from, line.text.slice(line.indent), `${head}${pad(gap)}${line.text.slice(noteAt)}`)].filter(
          (change): change is Change => change !== undefined,
        ),
      );
    } else {
      const change = minimalChange(from, line.text.slice(line.indent), printRow(nextRow));
      change && changes.push(change);
    }
  });
  const last = source.rows.at(-1)?.line;
  const lead = last ? pad(last.indent) : indent;
  const end = last?.to ?? field.to;
  const added = next.slice(source.rows.length).map((row) => `\n${lead}${printRow(row)}`);
  if (added.length > 0) {
    changes.push({ from: end, to: end, insert: added.join('') });
  }
  return changes;
};

const patchEntries = (
  text: string,
  block: SourceBlock,
  field: FieldSchema,
  next: readonly Entry[],
  indent: string,
): Change[] => {
  const entries = fieldsNamed(block, field.name);
  const deeper = `${indent}  `;
  const nextKeys = next.map(({ key }) => key);
  const currentKeys = entries.map(({ key }) => key ?? '');
  const kept = currentKeys.filter((key) => nextKeys.includes(key));
  const reordered = kept.join('\n') !== nextKeys.filter((key) => currentKeys.includes(key)).join('\n');
  // Entries next to each other can be reordered by moving their lines; scattered ones are patched in place.
  const contiguous = entries.every(
    (entry, index) =>
      index === 0 ||
      !block.fields.some(
        (other) => other.from > entries[index - 1].from && other.from < entry.from && other.name !== field.name,
      ),
  );
  if (reordered && contiguous && entries.length > 0) {
    const from = entries[0].from;
    const to = entries[entries.length - 1].to;
    const slices = new Map(entries.map((entry) => [entry.key ?? '', text.slice(entry.from, entry.to)]));
    const printed = next
      .map(({ key, text: value }) => {
        const slice = slices.get(key);
        const old = entries.find((entry) => entry.key === key);
        if (slice !== undefined && old && decodeText(old) === value) {
          return slice;
        }
        return printProse(value, `${field.name} ${key}: `, deeper);
      })
      .join(`\n${indent}`);
    const change = minimalChange(from, text.slice(from, to), printed);
    return change ? [change] : [];
  }
  const changes: Change[] = [];
  for (const entry of entries) {
    const target = next.find(({ key }) => key === entry.key);
    if (!target) {
      changes.push(deleteField(text, entry));
    } else if (decodeText(entry) !== target.text) {
      changes.push(...patchText(text, entry, target.text, deeper));
    }
  }
  const added = next.filter(({ key }) => !currentKeys.includes(key));
  if (added.length > 0) {
    const printed = added
      .map(({ key, text: value }) => printProse(value, `${indent}${field.name} ${key}: `, deeper))
      .join('\n');
    const last = entries.at(-1);
    if (last) {
      changes.push({ from: last.to, to: last.to, insert: `\n${printed}` });
    } else {
      // A first entry is set off by a blank line, as the language's own blocks write it.
      const anchor = Math.max(
        block.header.to,
        ...block.prose.map((line) => line.to),
        ...block.fields.map(({ to }) => to),
      );
      changes.push({ from: anchor, to: anchor, insert: `\n\n${printed}` });
    }
  }
  return changes;
};

const patchRaw = (text: string, field: SourceField, next: string, indent: string): Change[] => {
  const { from, to } = valueRange(field);
  const lines = next.split('\n');
  const printed =
    lines.length === 1 && field.lines.length === 0
      ? lines[0]
      : field.inline.text
        ? [lines[0], ...lines.slice(1).map((line) => (line ? `${indent}${line}` : line))].join('\n')
        : lines.map((line) => (line ? `${indent}${line}` : line)).join('\n');
  const change = minimalChange(from, text.slice(from, to), printed);
  return change ? [change] : [];
};

const patchTitle = (block: SourceBlock, title: string | undefined): Change[] => {
  const { header } = block;
  if (header.title) {
    if (!title) {
      const end = header.id?.to ?? header.kind.to;
      return [{ from: end, to: header.title.to, insert: '' }];
    }
    const change = minimalChange(header.title.from, block.title ?? '', title);
    return change ? [change] : [];
  }
  if (!title) {
    return [];
  }
  const end = header.id?.to ?? header.kind.to;
  return [{ from: end, to: end, insert: `: ${title}` }];
};

const patchProse = (text: string, block: SourceBlock, next: string | undefined): Change[] => {
  const lines = proseLines(block);
  const indent = pad(block.indent);
  if (lines.length === 0) {
    return next
      ? [{ from: block.header.to, to: block.header.to, insert: `\n${printProse(next, indent, indent)}` }]
      : [];
  }
  const from = lines[0].from + lines[0].indent;
  const to = lines[lines.length - 1].to;
  if (!next) {
    return [{ from: lineStart(text, lines[0].from) - 1, to, insert: '' }];
  }
  const change = minimalChange(from, text.slice(from, to), reproseRange(text, from, to, next, indent));
  return change ? [change] : [];
};

const sameValue = (a: FieldValue | undefined, b: FieldValue | undefined) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The changes that turn `block` into one stating `next`, each confined to the source range of a field,
 * row, item or entry that changed, so comments, alignment and the fields not edited keep their bytes.
 * Offsets are into `text`, the whole spec.
 */
export const patchBlock = (text: string, block: SourceBlock, schema: BlockSchema, next: BlockValue): Change[] => {
  const before = decodeBlock(text, block, schema);
  const indent = pad(block.indent);
  const deeper = pad(block.indent + 2);
  const changes: Change[] = [];
  if ((next.title ?? '') !== (before.title ?? '')) {
    changes.push(...patchTitle(block, next.title));
  }
  if (schema.inlineProse && (next.prose ?? '') !== (before.prose ?? '')) {
    changes.push(...patchProse(text, block, next.prose));
  }
  for (const field of schema.fields) {
    const value = next.fields[field.name];
    if (sameValue(value, before.fields[field.name])) {
      continue;
    }
    const codec = before.raw.includes(field.name) ? 'raw' : codecOf(field);
    if (codec === 'entries') {
      changes.push(...patchEntries(text, block, field, (value ?? []) as readonly Entry[], indent));
      continue;
    }
    const source = block.fields.find((candidate) => candidate.name === field.name && candidate.key === undefined);
    if (!source) {
      if (!isEmpty(value)) {
        changes.push(insertField(text, block, schema, field, printField(field, value!, indent)));
      }
      continue;
    }
    if (isEmpty(value)) {
      changes.push(deleteField(text, source));
      continue;
    }
    const patched = (() => {
      switch (codec) {
        case 'text':
          return patchText(text, source, value as string, deeper);
        case 'scalar':
          return patchScalar(text, source, value as string);
        case 'list':
          return patchList(text, source, value as readonly string[], deeper);
        case 'rows':
          return patchRows(text, source, value as readonly Row[], deeper);
        default:
          return patchRaw(text, source, value as string, deeper);
      }
    })();
    // A field whose source a codec stopped reading is rewritten whole.
    changes.push(
      ...(patched ?? [
        { from: lineStart(text, source.from), to: source.to, insert: printField(field, value!, indent) },
      ]),
    );
  }
  return changes;
};

/** A block of `schema`'s kind with id `id` stating `value`, fenced as `mdl`, in the form `patchBlock` writes. */
export const printBlock = (schema: BlockSchema, id: string, value: Omit<BlockValue, 'raw'>): string => {
  const head = ['```mdl', `${schema.kind}${id ? ` ${id}` : ''}`, '```'].join('\n');
  const [block] = parseSourceBlocks(head, { keyed: () => keyedFields(schema) });
  return applyChanges(head, patchBlock(head, block, schema, { ...value, raw: [] }));
};

/** The source range of a field's value in the spec text, for anchoring a comment or a bound editor. */
export const fieldRange = (
  block: SourceBlock,
  name: string,
  key?: string,
): { from: number; to: number } | undefined => {
  const field = block.fields.find((candidate) => candidate.name === name && candidate.key === key);
  return field && valueRange(field);
};

/** A part of a block an editor edits as text: its title, its inline prose, a field, or one keyed line. */
export type BlockPart = { part: 'title' } | { part: 'prose' } | { part: 'field'; name: string; key?: string };

/** A part's text as an editor shows it, and the source range it is read from; empty at its insertion point when absent. */
export const partSource = (
  text: string,
  block: SourceBlock,
  schema: BlockSchema,
  part: BlockPart,
): { value: string; from: number; to: number } => {
  const value = decodeBlock(text, block, schema);
  switch (part.part) {
    case 'title':
      return block.header.title
        ? { value: value.title ?? '', ...block.header.title }
        : { value: '', from: block.header.to, to: block.header.to };
    case 'prose': {
      const lines = proseLines(block);
      return lines.length > 0
        ? { value: value.prose ?? '', from: lines[0].from + lines[0].indent, to: lines[lines.length - 1].to }
        : { value: '', from: block.header.to, to: block.header.to };
    }
    case 'field': {
      const range = fieldRange(block, part.name, part.key) ?? { from: block.to, to: block.to };
      const field = value.fields[part.name];
      const text =
        part.key === undefined
          ? typeof field === 'string'
            ? field
            : ''
          : ((field as readonly Entry[] | undefined)?.find(({ key }) => key === part.key)?.text ?? '');
      return { value: text, ...range };
    }
  }
};

/** The changes that set one part of a block to `next`. */
export const patchPart = (
  text: string,
  block: SourceBlock,
  schema: BlockSchema,
  part: BlockPart,
  next: string,
): Change[] => {
  const value = decodeBlock(text, block, schema);
  switch (part.part) {
    case 'title':
      return patchBlock(text, block, schema, { ...value, title: next });
    case 'prose':
      return patchBlock(text, block, schema, { ...value, prose: next });
    case 'field': {
      const field =
        part.key === undefined
          ? next
          : ((value.fields[part.name] ?? []) as readonly Entry[]).map((entry) =>
              entry.key === part.key ? { ...entry, text: next } : entry,
            );
      return patchBlock(text, block, schema, { ...value, fields: { ...value.fields, [part.name]: field } });
    }
  }
};
