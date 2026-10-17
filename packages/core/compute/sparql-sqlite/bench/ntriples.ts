//
// Copyright 2026 DXOS.org
//

import { type Quad, type Term } from '../src/index.ts';

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

const ESCAPES: Record<string, string> = {
  't': '\t',
  'b': '\b',
  'n': '\n',
  'r': '\r',
  'f': '\f',
  '"': '"',
  "'": "'",
  '\\': '\\',
};

/** Resolves ECHAR and UCHAR escapes; returns the input unchanged when it has none. */
const unescape = (text: string): string => {
  if (!text.includes('\\')) {
    return text;
  }
  return text.replace(/\\(u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|.)/g, (_match, code: string) => {
    if (code.length > 1) {
      return String.fromCodePoint(parseInt(code.slice(1), 16));
    }
    const char = ESCAPES[code];
    if (char === undefined) {
      throw new Error(`bad escape \\${code}`);
    }
    return char;
  });
};

/** Parses one term at `start`; returns the term and the index just past it. */
const parseTerm = (line: string, start: number): [Term, number] => {
  const first = line.charCodeAt(start);
  if (first === 60 /* < */) {
    const end = line.indexOf('>', start + 1);
    if (end < 0) {
      throw new Error('unterminated IRI');
    }
    return [{ termType: 'NamedNode', value: unescape(line.slice(start + 1, end)) }, end + 1];
  }
  if (first === 95 /* _ */) {
    let end = start + 2;
    while (end < line.length && line.charCodeAt(end) > 32) {
      end++;
    }
    // A label may not end with '.', which is then the statement terminator.
    while (line.charCodeAt(end - 1) === 46) {
      end--;
    }
    return [{ termType: 'BlankNode', value: line.slice(start + 2, end) }, end];
  }
  if (first === 34 /* " */) {
    let end = start + 1;
    for (;;) {
      end = line.indexOf('"', end);
      if (end < 0) {
        throw new Error('unterminated literal');
      }
      let slashes = 0;
      while (line.charCodeAt(end - 1 - slashes) === 92) {
        slashes++;
      }
      if (slashes % 2 === 0) {
        break;
      }
      end++;
    }
    const value = unescape(line.slice(start + 1, end));
    let next = end + 1;
    if (line.charCodeAt(next) === 64 /* @ */) {
      let langEnd = next + 1;
      while (langEnd < line.length && /[A-Za-z0-9-]/.test(line[langEnd])) {
        langEnd++;
      }
      return [{ termType: 'Literal', value, language: line.slice(next + 1, langEnd).toLowerCase() }, langEnd];
    }
    if (line.charCodeAt(next) === 94 /* ^ */ && line.charCodeAt(next + 1) === 94) {
      const [datatype, after] = parseTerm(line, next + 2);
      next = after;
      if (datatype.value !== XSD_STRING) {
        return [{ termType: 'Literal', value, datatype: datatype.value }, next];
      }
    }
    return [{ termType: 'Literal', value }, next];
  }
  throw new Error(`unexpected '${line[start]}' at ${start}`);
};

const skipSpace = (line: string, index: number) => {
  while (index < line.length && (line.charCodeAt(index) === 32 || line.charCodeAt(index) === 9)) {
    index++;
  }
  return index;
};

/**
 * Parses N-Triples or N-Quads text (one statement per line, no prefixes). Blank node labels are kept as
 * written, so labels shared across batches of one document denote the same node.
 */
export const parseNTriples = (text: string): Quad[] => {
  const quads: Quad[] = [];
  let lineStart = 0;
  while (lineStart < text.length) {
    let lineEnd = text.indexOf('\n', lineStart);
    if (lineEnd < 0) {
      lineEnd = text.length;
    }
    const line = text.slice(lineStart, lineEnd);
    lineStart = lineEnd + 1;
    let index = skipSpace(line, 0);
    if (index >= line.length || line[index] === '#' || line[index] === '\r') {
      continue;
    }
    try {
      const [s, afterS] = parseTerm(line, index);
      const [p, afterP] = parseTerm(line, skipSpace(line, afterS));
      const [o, afterO] = parseTerm(line, skipSpace(line, afterP));
      index = skipSpace(line, afterO);
      if (line[index] !== '.') {
        const [g] = parseTerm(line, index);
        quads.push({ s, p, o, g });
      } else {
        quads.push({ s, p, o });
      }
    } catch (err) {
      throw new Error(`N-Triples: ${err instanceof Error ? err.message : String(err)} in: ${line.slice(0, 200)}`);
    }
  }
  return quads;
};
