//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Rdf from './Rdf.ts';

//
// A TriG writer whose output matches n3's `Writer` in TriG mode character for character (prefix block, named graph
// blocks, `;` and `,` grouping, datatype abbreviations, escapes, base direction), so readers of n3's TriG keep working;
// it differs only where n3's output would not read back: an IRI that only looks prefixed stays bracketed, and quoted
// triples and variables are refused.
//

const XSD = 'http://www.w3.org/2001/XMLSchema#';

const ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\\\',
  '"': '\\"',
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
  '\b': '\\b',
  '\f': '\\f',
};

const escapeCharacter = (character: string): string => {
  const known = ESCAPES[character];
  if (known !== undefined) {
    return known;
  }
  if (character.length === 1) {
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
  }
  // A surrogate pair: its code point as an 8-digit escape.
  const codePoint = (character.charCodeAt(0) - 0xd800) * 0x400 + character.charCodeAt(1) + 0x2400;
  return `\\U${codePoint.toString(16).padStart(8, '0')}`;
};

/** Code units up to U+0019 are escaped, as n3 does (it leaves U+001A..U+001F as they are). */
const isEscaped = (code: number): boolean => code === 0x22 || code === 0x5c || code <= 0x19;
const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

/** Escapes quotes, backslashes, control characters and surrogate pairs, scanning code units so no regex holds control characters. */
const escape = (text: string): string => {
  let output = '';
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    const width = isEscaped(code) ? 1 : isHighSurrogate(code) && isLowSurrogate(text.charCodeAt(index + 1)) ? 2 : 0;
    if (width > 0) {
      output += text.slice(start, index) + escapeCharacter(text.slice(index, index + width));
      index += width - 1;
      start = index + 1;
    }
  }
  return start === 0 ? text : output + text.slice(start);
};

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export type WriteOptions = {
  /** Namespaces to abbreviate IRIs with, by prefix; a later prefix for the same namespace replaces an earlier one. */
  readonly prefixes?: Readonly<Record<string, string>>;
};

/** Serializes quads as TriG, in the order given; consecutive quads that share a graph and subject are grouped. */
export const write = (quads: Iterable<Rdf.Quad>, { prefixes = {} }: WriteOptions = {}): string => {
  const prefixByNamespace = new Map<string, string>();
  let output = '';
  for (const [prefix, namespace] of Object.entries(prefixes)) {
    prefixByNamespace.set(namespace, `${prefix}:`);
    output += `@prefix ${prefix}: <${namespace}>.\n`;
  }
  const hasPrefixes = prefixByNamespace.size > 0;
  if (hasPrefixes) {
    output += '\n';
  }

  // An IRI in one of the namespaces followed by a valid local name; any other IRI keeps its angle brackets.
  const prefixPattern = hasPrefixes
    ? new RegExp(`^(${[...prefixByNamespace.keys()].map(escapeRegex).join('|')})([_a-zA-Z0-9][\\-_a-zA-Z0-9]*)$`)
    : undefined;

  const iriOrBlank = (term: Rdf.Term): string => {
    if (term.termType !== 'NamedNode') {
      return `_:${term.value}`;
    }
    const iri = escape(term.value);
    const match = prefixPattern?.exec(iri);
    if (!match) {
      return `<${iri}>`;
    }
    return `${prefixByNamespace.get(match[1])}${match[2]}`;
  };

  const literal = (term: Rdf.Literal): string => {
    const value = escape(term.value);
    if (term.language) {
      return `"${value}"@${term.language}${term.direction ? `--${term.direction}` : ''}`;
    }
    switch (term.datatype.value) {
      case `${XSD}string`:
        return `"${value}"`;
      case `${XSD}boolean`:
        if (value === 'true' || value === 'false') {
          return value;
        }
        break;
      case `${XSD}integer`:
        if (/^[+-]?\d+$/.test(value)) {
          return value;
        }
        break;
      case `${XSD}decimal`:
        if (/^[+-]?\d*\.\d+$/.test(value)) {
          return value;
        }
        break;
      case `${XSD}double`:
        if (/^[+-]?(?:\d+\.\d*|\.?\d+)[eE][+-]?\d+$/.test(value)) {
          return value;
        }
        break;
    }
    return `"${value}"^^${iriOrBlank(term.datatype)}`;
  };

  const object = (term: Rdf.QuadObject): string => (term.termType === 'Literal' ? literal(term) : iriOrBlank(term));
  const predicate = (term: Rdf.QuadPredicate): string =>
    term.termType === 'NamedNode' && term.value === Rdf.RDF_TYPE ? 'a' : iriOrBlank(term);

  let graph: Rdf.QuadGraph = Rdf.defaultGraph();
  let subject: Rdf.QuadSubject | undefined;
  let lastPredicate: Rdf.QuadPredicate | undefined;
  const closing = () => (graph.termType === 'DefaultGraph' ? '.\n' : '\n}\n');

  for (const next of quads) {
    for (const term of [next.subject, next.predicate, next.object, next.graph]) {
      if (term.termType === 'Quad' || term.termType === 'Variable') {
        throw new TypeError(
          `TriG cannot write a ${term.termType === 'Quad' ? 'quoted triple' : 'variable'} as a term.`,
        );
      }
    }
    if (!next.graph.equals(graph)) {
      output +=
        (subject === undefined ? '' : closing()) +
        (next.graph.termType === 'DefaultGraph' ? '' : `${iriOrBlank(next.graph)} {\n`);
      graph = next.graph;
      subject = undefined;
    }
    if (subject !== undefined && next.subject.equals(subject)) {
      output +=
        lastPredicate !== undefined && next.predicate.equals(lastPredicate)
          ? `, ${object(next.object)}`
          : `;\n    ${predicate(next.predicate)} ${object(next.object)}`;
    } else {
      output += `${subject === undefined ? '' : '.\n'}${iriOrBlank(next.subject)} ${predicate(next.predicate)} ${object(next.object)}`;
    }
    subject = next.subject;
    lastPredicate = next.predicate;
  }
  if (subject !== undefined) {
    output += closing();
  }
  return output;
};
