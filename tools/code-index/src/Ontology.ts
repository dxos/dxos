//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';
import type { Schema as LdkitSchema } from 'ldkit';
import { rdf, xsd } from 'ldkit/namespaces';
import { DataFactory, type NamedNode } from 'n3';

/**
 * The DEUS code vocabulary — the executable mirror of `design/ONTOLOGY.md`, which is the source of
 * truth. IRIs, the JSON-LD context the indexer emits, and the LDkit schemas that read it back.
 */

export const PREFIX = 'https://dxos.org/vocab/deus#';

export const FILE_BASE = 'https://dxos.org/deus/file/';

export const GRAPH_BASE = 'https://dxos.org/deus/graph/';

export const iri = (term: string): NamedNode => DataFactory.namedNode(`${PREFIX}${term}`);

/** IRI of a file resource; stable across revisions of that file. */
export const fileIri = (path: string): NamedNode => DataFactory.namedNode(`${FILE_BASE}${encodeURIComponent(path)}`);

export const symbolIri = (path: string, name: string): NamedNode =>
  DataFactory.namedNode(`${FILE_BASE}${encodeURIComponent(path)}#${encodeURIComponent(name)}`);

/** IRI of the named graph holding one revision of a file; the mtime makes the swap atomic. */
export const graphIri = (path: string, mtime: number): NamedNode =>
  DataFactory.namedNode(`${GRAPH_BASE}${encodeURIComponent(path)}#${mtime}`);

/**
 * The one graph holding everything rules derived. Kept apart from the file graphs so a reasoning
 * pass can drop the whole of it and recompute — a derived fact must never outlive its premises.
 */
export const DERIVED_GRAPH = DataFactory.namedNode(`${GRAPH_BASE}derived`);

// Classes.
export const File = iri('File');
export const Symbol = iri('Symbol');

// File properties.
export const path = iri('path');
export const language = iri('language');
export const size = iri('size');
export const mtime = iri('mtime');
export const hash = iri('hash');
export const imports = iri('imports');
export const importsModule = iri('importsModule');
export const declares = iri('declares');
export const parseError = iri('parseError');

// Symbol properties.
export const name = iri('name');
export const kind = iri('kind');
export const exported = iri('exported');
export const line = iri('line');

/**
 * Derived by rules, never written by the indexer. Reachability over `deus:imports` is deliberately
 * NOT among these: a SPARQL property path (`deus:imports+`) walks it lazily, where a closure rule
 * would recompute and store hundreds of thousands of quads on every pass.
 */
export const importsTestFile = iri('importsTestFile');

export const type = DataFactory.namedNode(rdf.type);

/** The `@context` of every document the indexer emits. */
export const CONTEXT = {
  deus: PREFIX,
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  File: 'deus:File',
  Symbol: 'deus:Symbol',
  path: 'deus:path',
  language: 'deus:language',
  hash: 'deus:hash',
  name: 'deus:name',
  kind: 'deus:kind',
  importsModule: 'deus:importsModule',
  parseError: 'deus:parseError',
  size: { '@id': 'deus:size', '@type': 'xsd:integer' },
  mtime: { '@id': 'deus:mtime', '@type': 'xsd:integer' },
  line: { '@id': 'deus:line', '@type': 'xsd:integer' },
  exported: { '@id': 'deus:exported', '@type': 'xsd:boolean' },
  imports: { '@id': 'deus:imports', '@type': '@id' },
  declares: { '@id': 'deus:declares', '@type': '@id' },
} as const;

/** One file's document, as emitted by the indexer worker — the shape `design/ONTOLOGY.md` fixes. */
export const SymbolNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Symbol'),
  'name': Schema.String,
  'kind': Schema.String,
  'exported': Schema.Boolean,
  'line': Schema.Number,
});

export type SymbolNode = typeof SymbolNode.Type;

export const FileDocument = Schema.Struct({
  // The context is a constant of this module; it travels with the document so the JSON-LD is
  // self-describing on the wire and in a dump.
  '@context': Schema.Unknown,
  '@id': Schema.String,
  '@type': Schema.Literal('File'),
  'path': Schema.String,
  'language': Schema.String,
  'size': Schema.Number,
  'mtime': Schema.Number,
  'hash': Schema.String,
  'imports': Schema.Array(Schema.String),
  'importsModule': Schema.Array(Schema.String),
  'declares': Schema.Array(SymbolNode),
  'parseError': Schema.optional(Schema.Array(Schema.String)),
});

export type FileDocument = typeof FileDocument.Type;

// Array properties are also marked optional: LDkit drops an entity whose array property has no
// values, and a file with no imports is still a file.
export const FileSchema = {
  '@type': File.value,
  'path': { '@id': path.value, '@type': xsd.string },
  'language': { '@id': language.value, '@type': xsd.string },
  'size': { '@id': size.value, '@type': xsd.integer },
  'mtime': { '@id': mtime.value, '@type': xsd.integer },
  'hash': { '@id': hash.value, '@type': xsd.string },
  'imports': { '@id': imports.value, '@array': true, '@optional': true },
  'importsTestFile': { '@id': importsTestFile.value, '@array': true, '@optional': true },
} as const satisfies LdkitSchema;

export const SymbolSchema = {
  '@type': Symbol.value,
  'name': { '@id': name.value, '@type': xsd.string },
  'kind': { '@id': kind.value, '@type': xsd.string },
  'line': { '@id': line.value, '@type': xsd.integer },
} as const satisfies LdkitSchema;

/**
 * Prefixes used when serializing the graph to Turtle/N3. Vocabulary namespaces only: abbreviating
 * `file:` or `graph:` emits prefixed names whose local part is a percent-encoded path, and a path
 * beginning with `.` (`.agents/...`) is not a legal PNAME — the writer emits it anyway and no
 * parser reads it back.
 */
export const prefixes: Record<string, string> = {
  deus: PREFIX,
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};
