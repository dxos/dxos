//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, type MdlMap, MdlSyntaxError, type MdlValue } from './types.ts';
import { parseInline, stripComment } from './values.ts';

type Line = { indent: number; text: string; raw: string; line: number };

const FENCE_OPEN = /^\s*```mdl\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const HEADER = /^([A-Za-z_][\w-]*)(?:\s+([^\s:][^:]*?))?(?:\s*:\s*(.*))?$/;
const KEY = /^([A-Za-z_][\w-]*)(\?)?\s*:(?:\s+(.*))?$/;

const toLine = (raw: string, line: number): Line => ({
  indent: raw.length - raw.trimStart().length,
  text: raw.trim(),
  raw,
  line,
});

const isBlank = (line: Line): boolean => line.text === '' || line.text.startsWith('#');

const nextContent = (lines: Line[], start: number): number => {
  let index = start;
  for (;;) {
    const line = lines[index];
    if (line === undefined || !isBlank(line)) {
      return index;
    }
    index++;
  }
};

const extractBodies = (source: string): Line[][] => {
  const raw = source.split(/\r?\n/);
  if (!raw.some((text) => FENCE_OPEN.test(text))) {
    return [raw.map((text, line) => toLine(text, line))];
  }
  const bodies: Line[][] = [];
  let current: Line[] | undefined;
  for (const [line, text] of raw.entries()) {
    if (current === undefined) {
      if (FENCE_OPEN.test(text)) {
        current = [];
      }
    } else if (FENCE_CLOSE.test(text)) {
      bodies.push(current);
      current = undefined;
    } else {
      current.push(toLine(text, line));
    }
  }
  if (current !== undefined) {
    bodies.push(current);
  }
  return bodies;
};

const blockScalar = (lines: Line[], start: number, indent: number): [string, number] => {
  const taken: Line[] = [];
  let index = start;
  for (
    let line = lines[index];
    line !== undefined && (line.text === '' || line.indent > indent);
    line = lines[++index]
  ) {
    taken.push(line);
  }
  while (taken.length > 0 && taken[taken.length - 1]?.text === '') {
    taken.pop();
  }
  const margin = Math.min(...taken.filter((line) => line.text !== '').map((line) => line.indent));
  return [taken.map((line) => (line.text === '' ? '' : line.raw.slice(margin).trimEnd())).join('\n'), index];
};

const parseEntry = (lines: Line[], index: number, text: string, indent: number): [string, MdlValue, number] => {
  const lineNumber = lines[index]?.line ?? 0;
  const match = KEY.exec(stripComment(text));
  if (!match) {
    throw new MdlSyntaxError(`Expected "key: value", got "${text}"`, lineNumber);
  }
  const [, key = '', , rest] = match;
  if (rest === '|') {
    return [key, ...blockScalar(lines, index + 1, indent)];
  }
  if (rest !== undefined && rest !== '') {
    return [key, parseInline(rest, lineNumber), index + 1];
  }
  const childIndex = nextContent(lines, index + 1);
  const child = lines[childIndex];
  if (child === undefined || child.indent <= indent) {
    return [key, null, index + 1];
  }
  if (child.text === '-' || child.text.startsWith('- ')) {
    return [key, ...parseSequence(lines, childIndex, child.indent)];
  }
  return [key, ...parseMapping(lines, childIndex, child.indent)];
};

const parseMapping = (lines: Line[], start: number, indent: number, into: MdlMap = {}): [MdlMap, number] => {
  let index = start;
  for (;;) {
    index = nextContent(lines, index);
    const line = lines[index];
    if (line === undefined || line.indent < indent) {
      return [into, index];
    }
    if (line.indent > indent) {
      throw new MdlSyntaxError('Unexpected indentation', line.line);
    }
    const [key, value, next] = parseEntry(lines, index, line.text, indent);
    if (Object.hasOwn(into, key)) {
      throw new MdlSyntaxError(`Duplicate field "${key}"`, line.line);
    }
    into[key] = value;
    index = next;
  }
};

const parseSequence = (lines: Line[], start: number, indent: number): [MdlValue[], number] => {
  const items: MdlValue[] = [];
  let index = start;
  for (;;) {
    index = nextContent(lines, index);
    const line = lines[index];
    if (line === undefined || line.indent < indent) {
      return [items, index];
    }
    if (line.indent > indent || !(line.text === '-' || line.text.startsWith('- '))) {
      throw new MdlSyntaxError('Expected a list item "- …"', line.line);
    }
    const itemText = line.text.slice(1).trim();
    const itemIndent = indent + 2;
    if (KEY.test(stripComment(itemText))) {
      const [key, value, next] = parseEntry(lines, index, itemText, itemIndent);
      const [map, after] = parseMapping(lines, next, itemIndent, { [key]: value });
      items.push(map);
      index = after;
    } else {
      items.push(itemText === '' ? null : parseInline(stripComment(itemText), line.line));
      index++;
    }
  }
};

const parseBody = (lines: Line[]): MdlBlock[] => {
  const blocks: MdlBlock[] = [];
  let index = nextContent(lines, 0);
  for (let line = lines[index]; line !== undefined; line = lines[index]) {
    if (line.indent !== 0) {
      throw new MdlSyntaxError('Expected a block header at column 0', line.line);
    }
    const match = HEADER.exec(stripComment(line.text));
    if (!match) {
      throw new MdlSyntaxError(`Invalid block header "${line.text}"`, line.line);
    }
    const [, type = '', id, title] = match;
    const first = nextContent(lines, index + 1);
    const child = lines[first];
    let fields: MdlMap = {};
    let next = first;
    if (child !== undefined && child.indent > 0) {
      [fields, next] = parseMapping(lines, first, child.indent);
    }
    blocks.push({
      type,
      ...(id ? { id: id.trim() } : {}),
      ...(title ? { title: title.trim() } : {}),
      fields,
      line: line.line,
    });
    index = nextContent(lines, next);
  }
  return blocks;
};

/**
 * Parses MDL source into blocks.
 * Accepts a bare MDL body or a markdown document whose ```mdl fences hold the blocks.
 */
export const parseMdl = (source: string): MdlBlock[] => extractBodies(source).flatMap(parseBody);
