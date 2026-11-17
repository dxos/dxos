//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type BlankNode, DataFactory, type Literal, type NamedNode, Parser, type Term as RdfTerm, Writer } from 'n3';

import { type Quad, type Term } from './terms.ts';

//
// Serializations for moving a store's quads in and out in bulk. Kept apart from the engine (and loaded by hosts only
// when an import or export runs) because the text format needs n3, which no query or write path should load.
//

/**
 * `trig`: the Turtle family's syntax with named graphs, which plain Turtle cannot express and every fact is stored in.
 * `binary`: a term dictionary followed by quads as dictionary indexes, several times smaller and faster to read.
 */
export type Format = 'trig' | 'binary';

const MAGIC = [0x44, 0x58, 0x51, 0x01]; // "DXQ" and format version 1.

const Kind = { IRI: 0, BLANK: 1, LITERAL: 2 } as const;

/** Serializes quads; the default graph's quads have no `g`. */
export type EncodeOptions = {
  /** Namespace prefixes TriG abbreviates IRIs with, by prefix. */
  readonly prefixes?: Readonly<Record<string, string>>;
};

export const encode = (quads: readonly Quad[], format: Format, options: EncodeOptions = {}): Uint8Array =>
  format === 'binary' ? encodeBinary(quads) : new TextEncoder().encode(encodeTrig(quads, options.prefixes));

/** The inverse of {@link encode}; throws on malformed input. */
export const decode = (data: Uint8Array, format: Format): Quad[] =>
  format === 'binary' ? decodeBinary(data) : decodeTrig(new TextDecoder().decode(data));

//
// TriG.
//

const toObject = (term: Term): NamedNode | BlankNode | Literal => {
  switch (term.termType) {
    case 'NamedNode':
      return DataFactory.namedNode(term.value);
    case 'BlankNode':
      return DataFactory.blankNode(term.value);
    case 'Literal':
      return DataFactory.literal(
        term.value,
        term.language ?? (term.datatype ? DataFactory.namedNode(term.datatype) : undefined),
      );
  }
};

/** A subject or graph position: a literal there is not RDF. */
const toResource = (term: Term): NamedNode | BlankNode => {
  const resource = toObject(term);
  if (resource.termType === 'Literal') {
    throw new TypeError(`A literal cannot be a subject or graph: ${term.value}`);
  }
  return resource;
};

const toPredicate = (term: Term): NamedNode => {
  if (term.termType !== 'NamedNode') {
    throw new TypeError(`A predicate must be an IRI: ${term.value}`);
  }
  return DataFactory.namedNode(term.value);
};

const fromRdf = (term: RdfTerm): Term => {
  switch (term.termType) {
    case 'NamedNode':
      return { termType: 'NamedNode', value: term.value };
    case 'BlankNode':
      return { termType: 'BlankNode', value: term.value };
    case 'Literal': {
      const datatype = term.datatype.value;
      return {
        termType: 'Literal',
        value: term.value,
        language: term.language || undefined,
        datatype:
          term.language || datatype === 'http://www.w3.org/2001/XMLSchema#string' ? undefined : datatype || undefined,
      };
    }
    default:
      throw new TypeError(`Unsupported term in a quad: ${term.termType}`);
  }
};

const encodeTrig = (quads: readonly Quad[], prefixes: Readonly<Record<string, string>> = {}): string => {
  // `quadsToString` writes N-Quads lines; TriG's graph blocks come only from the writer's own buffering.
  const writer = new Writer({ format: 'application/trig', prefixes: { ...prefixes } });
  writer.addQuads(
    quads.map((quad) =>
      DataFactory.quad(
        toResource(quad.s),
        toPredicate(quad.p),
        toObject(quad.o),
        quad.g ? toResource(quad.g) : DataFactory.defaultGraph(),
      ),
    ),
  );
  let text: string | undefined;
  writer.end((error, result: string) => {
    if (error) {
      throw error;
    }
    text = result;
  });
  if (text === undefined) {
    throw new Error('The TriG writer did not finish synchronously.');
  }
  return text;
};

const decodeTrig = (text: string): Quad[] =>
  // An empty prefix keeps blank-node labels as written, so an export imports back to the same graph.
  new Parser({ format: 'application/trig', blankNodePrefix: '' }).parse(text).map((quad) => ({
    s: fromRdf(quad.subject),
    p: fromRdf(quad.predicate),
    o: fromRdf(quad.object),
    g: quad.graph.termType === 'DefaultGraph' ? undefined : fromRdf(quad.graph),
  }));

//
// Binary.
//

class Writer8 {
  #bytes: number[] = [];

  varint(value: number): void {
    let rest = value;
    while (rest >= 0x80) {
      this.#bytes.push((rest & 0x7f) | 0x80);
      rest = Math.floor(rest / 0x80);
    }
    this.#bytes.push(rest);
  }

  string(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.varint(bytes.length);
    for (const byte of bytes) {
      this.#bytes.push(byte);
    }
  }

  raw(bytes: readonly number[]): void {
    this.#bytes.push(...bytes);
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.#bytes);
  }
}

class Reader8 {
  #offset = 0;
  constructor(readonly data: Uint8Array) {}

  byte(): number {
    if (this.#offset >= this.data.length) {
      throw new RangeError('Unexpected end of binary quads.');
    }
    return this.data[this.#offset++];
  }

  varint(): number {
    let value = 0;
    let scale = 1;
    for (;;) {
      const byte = this.byte();
      value += (byte & 0x7f) * scale;
      if (byte < 0x80) {
        return value;
      }
      scale *= 0x80;
    }
  }

  string(): string {
    const length = this.varint();
    const start = this.#offset;
    this.#offset += length;
    if (this.#offset > this.data.length) {
      throw new RangeError('Unexpected end of binary quads.');
    }
    return new TextDecoder().decode(this.data.subarray(start, this.#offset));
  }
}

const termKey = (term: Term): string =>
  JSON.stringify([
    term.termType,
    term.value,
    term.termType === 'Literal' ? (term.datatype ?? '') : '',
    term.termType === 'Literal' ? (term.language ?? '') : '',
  ]);

const encodeBinary = (quads: readonly Quad[]): Uint8Array => {
  const index = new Map<string, number>();
  const terms: Term[] = [];
  const idOf = (term: Term): number => {
    const key = termKey(term);
    let id = index.get(key);
    if (id === undefined) {
      id = terms.length;
      index.set(key, id);
      terms.push(term);
    }
    return id;
  };
  const ids = quads.map((quad) => [idOf(quad.s), idOf(quad.p), idOf(quad.o), quad.g ? idOf(quad.g) + 1 : 0]);

  const out = new Writer8();
  out.raw(MAGIC);
  out.varint(terms.length);
  for (const term of terms) {
    if (term.termType === 'Literal') {
      out.varint(Kind.LITERAL);
      out.string(term.value);
      out.string(term.datatype ?? '');
      out.string(term.language ?? '');
    } else {
      out.varint(term.termType === 'NamedNode' ? Kind.IRI : Kind.BLANK);
      out.string(term.value);
    }
  }
  out.varint(ids.length);
  for (const quad of ids) {
    quad.forEach((id) => out.varint(id));
  }
  return out.finish();
};

const decodeBinary = (data: Uint8Array): Quad[] => {
  const input = new Reader8(data);
  for (const byte of MAGIC) {
    if (input.byte() !== byte) {
      throw new TypeError('Not binary quads (bad header or version).');
    }
  }
  const terms: Term[] = [];
  const termCount = input.varint();
  for (let index = 0; index < termCount; index++) {
    const kind = input.varint();
    const value = input.string();
    if (kind === Kind.LITERAL) {
      const datatype = input.string();
      const language = input.string();
      terms.push({ termType: 'Literal', value, datatype: datatype || undefined, language: language || undefined });
    } else {
      terms.push({ termType: kind === Kind.IRI ? 'NamedNode' : 'BlankNode', value });
    }
  }
  const term = (id: number): Term => {
    const found = terms[id];
    if (!found) {
      throw new RangeError(`Binary quads name a missing term: ${id}`);
    }
    return found;
  };
  const quads: Quad[] = [];
  const quadCount = input.varint();
  for (let index = 0; index < quadCount; index++) {
    const [s, p, o, g] = [input.varint(), input.varint(), input.varint(), input.varint()];
    quads.push({ s: term(s), p: term(p), o: term(o), g: g === 0 ? undefined : term(g - 1) });
  }
  return quads;
};
