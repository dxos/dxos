//
// Copyright 2026 DXOS.org
//

import * as Ontology from '../Ontology.ts';

/**
 * A {@link Ontology.FileDocument} straight to N-Triples, for the one context the indexer emits. A
 * general JSON-LD processor re-reads that context for every document, and over a cold pass the
 * native store spent most of its commit time doing so; this walk resolves each key against a table
 * built once. `ntriples.test.ts` holds it to the same triples a JSON-LD parser produces.
 */

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

type Term = { readonly iri: string; readonly type?: string };

const prefixes: Record<string, string> = Object.fromEntries(
  Object.entries(Ontology.CONTEXT).flatMap(([key, value]) =>
    typeof value === 'string' && /[#/]$/.test(value) ? [[key, value]] : [],
  ),
);

/** A compact IRI (`deus:path`) or term, expanded the way JSON-LD expands it against the context. */
const expand = (value: string): string => {
  const colon = value.indexOf(':');
  if (colon > 0 && !value.startsWith('//', colon + 1)) {
    const prefix = prefixes[value.slice(0, colon)];
    if (prefix !== undefined) {
      return `${prefix}${value.slice(colon + 1)}`;
    }
  }
  return value;
};

const terms: ReadonlyMap<string, Term> = new Map(
  Object.entries(Ontology.CONTEXT).flatMap(([key, value]): [string, Term][] => {
    if (typeof value === 'string') {
      return prefixes[key] === undefined ? [[key, { iri: expand(value) }]] : [];
    }
    return [[key, { iri: expand(value['@id']), type: value['@type'] === '@id' ? '@id' : expand(value['@type']) }]];
  }),
);

// Only `"`, `\`, LF and CR must be escaped in an N-Triples string; a lone surrogate cannot be
// encoded at all, so it becomes U+FFFD as it would in any UTF-8 encoder.
const escapeString = (value: string): string =>
  value.toWellFormed().replace(/[\\"\n\r]/g, (char) => (char === '\n' ? '\\n' : char === '\r' ? '\\r' : `\\${char}`));

const literal = (lexical: string, datatype: string): string =>
  datatype === `${XSD}string` ? `"${escapeString(lexical)}"` : `"${escapeString(lexical)}"^^<${datatype}>`;

/** JSON-LD's canonical lexical form of a number: integers as written, the rest as `xsd:double`. */
const number = (value: number, type: string | undefined): string => {
  if (Number.isInteger(value) && Math.abs(value) < 1e21 && type !== `${XSD}double`) {
    return literal(String(value), type ?? `${XSD}integer`);
  }
  const [mantissa, exponent] = value.toExponential().split('e');
  return literal(`${mantissa.includes('.') ? mantissa : `${mantissa}.0`}E${Number(exponent)}`, type ?? `${XSD}double`);
};

const isNode = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Appends the triples of one node object, and of every node nested in it, to `out`. */
const node = (value: Record<string, unknown>, out: string[]): string => {
  const id = value['@id'];
  if (typeof id !== 'string') {
    // Every node the analyzers emit is named; a blank node would need labels unique per graph.
    throw new TypeError('Node without @id');
  }
  const subject = `<${expand(id)}>`;
  for (const [key, raw] of Object.entries(value)) {
    if (key === '@id' || key === '@context') {
      continue;
    }
    if (key === '@type') {
      for (const type of [raw].flat()) {
        if (typeof type === 'string') {
          out.push(`${subject} <${RDF_TYPE}> <${terms.get(type)?.iri ?? expand(type)}> .\n`);
        }
      }
      continue;
    }
    if (key === '@included') {
      for (const included of [raw].flat()) {
        if (isNode(included)) {
          node(included, out);
        }
      }
      continue;
    }
    const term = terms.get(key);
    // JSON-LD drops a key the context does not define.
    if (term === undefined) {
      continue;
    }
    const predicate = `<${term.iri}>`;
    for (const item of [raw].flat()) {
      const object = objectOf(item, term.type, out);
      if (object !== undefined) {
        out.push(`${subject} ${predicate} ${object} .\n`);
      }
    }
  }
  return subject;
};

const objectOf = (value: unknown, type: string | undefined, out: string[]): string | undefined => {
  if (isNode(value)) {
    return node(value, out);
  }
  if (typeof value === 'string') {
    if (type === '@id') {
      return `<${expand(value)}>`;
    }
    return literal(value, type ?? `${XSD}string`);
  }
  if (typeof value === 'number') {
    return number(value, type === '@id' ? undefined : type);
  }
  if (typeof value === 'boolean') {
    return literal(String(value), type === undefined || type === '@id' ? `${XSD}boolean` : type);
  }
  return undefined;
};

/** A file's ledger record and its triples: what the store commits. */
export const encodeDocument = (
  document: Ontology.FileDocument,
): {
  path: string;
  language: string;
  size: number;
  hash: string;
  mtime: number;
  triples: string;
} => ({
  path: document.path,
  language: document.language,
  size: document.size,
  hash: document.hash,
  mtime: document.mtime,
  triples: documentTriples(document),
});

/** The document's triples, one N-Triples statement per line, in no graph. */
export const documentTriples = (document: Ontology.FileDocument): string => {
  const out: string[] = [];
  node(document, out);
  return out.join('');
};
