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
 * truth. IRIs, the JSON-LD context the indexer emits, the document schema, and the LDkit schemas
 * that read it back.
 */

export const PREFIX = 'https://dxos.org/vocab/deus#';

export const FILE_BASE = 'https://dxos.org/deus/file/';

export const PACKAGE_BASE = 'https://dxos.org/deus/package/';

export const MODULE_BASE = 'https://dxos.org/deus/module/';

export const GRAPH_BASE = 'https://dxos.org/deus/graph/';

export const iri = (term: string): NamedNode => DataFactory.namedNode(`${PREFIX}${term}`);

/** IRI of a file resource; stable across revisions of that file. */
export const fileIri = (path: string): NamedNode => DataFactory.namedNode(`${FILE_BASE}${encodeURIComponent(path)}`);

export const symbolIri = (path: string, name: string): NamedNode =>
  DataFactory.namedNode(`${FILE_BASE}${encodeURIComponent(path)}#${encodeURIComponent(name)}`);

/** IRI of a workspace package, by its `package.json` name. */
export const packageIri = (name: string): NamedNode =>
  DataFactory.namedNode(`${PACKAGE_BASE}${encodeURIComponent(name)}`);

/**
 * IRI of a named export of a module *as imported* — `module:effect%2FLayer#effect`. Follows the
 * specifier written in source, so rules keyed on it survive the implementation file moving.
 */
export const memberIri = (specifier: string, path: string): NamedNode =>
  DataFactory.namedNode(`${MODULE_BASE}${encodeURIComponent(specifier)}#${path}`);

/** Both components are encoded: a `.mdl` documenting the grammar has a block whose type is `<type>`. */
export const specBlockIri = (path: string, blockType: string, key: string): NamedNode =>
  DataFactory.namedNode(
    `${FILE_BASE}${encodeURIComponent(path)}#${encodeURIComponent(blockType)}:${encodeURIComponent(key)}`,
  );

/** IRI of the named graph holding one revision of a file; the mtime makes the swap atomic. */
export const graphIri = (path: string, mtime: number): NamedNode =>
  DataFactory.namedNode(`${GRAPH_BASE}${encodeURIComponent(path)}#${mtime}`);

/**
 * The graph holding one reasoner's conclusions. Kept apart from the file graphs so a run can drop
 * the whole of it and recompute — a derived fact must never outlive its premises.
 */
export const derivedGraphIri = (reasoner: string): NamedNode =>
  DataFactory.namedNode(`${GRAPH_BASE}derived/${encodeURIComponent(reasoner)}`);

export const DERIVED_GRAPH_PREFIX = `${GRAPH_BASE}derived/`;

export const isDerivedGraph = (graph: string): boolean => graph.startsWith(DERIVED_GRAPH_PREFIX);

// Classes asserted by the parser.
export const File = iri('File');
export const Package = iri('Package');
export const Symbol = iri('Symbol');
export const Member = iri('Member');
export const SpecBlock = iri('SpecBlock');

// File properties.
export const path = iri('path');
export const language = iri('language');
export const size = iri('size');
export const mtime = iri('mtime');
export const hash = iri('hash');
export const inPackage = iri('inPackage');
export const imports = iri('imports');
export const importsType = iri('importsType');
export const importsModule = iri('importsModule');
export const reexports = iri('reexports');
export const declares = iri('declares');
export const declaresBlock = iri('declaresBlock');
export const describesPackage = iri('describesPackage');
export const unresolvedReferences = iri('unresolvedReferences');
export const parseError = iri('parseError');

// Package properties.
export const name = iri('name');
export const version = iri('version');
export const isPrivate = iri('private');
export const layer = iri('layer');
export const entry = iri('entry');
export const declaresDep = iri('declaresDep');
export const declaresDevDep = iri('declaresDevDep');
export const declaresPeerDep = iri('declaresPeerDep');
export const packagePath = iri('packagePath');

// Symbol properties.
export const kind = iri('kind');
export const exported = iri('exported');
export const line = iri('line');
export const extends_ = iri('extends');
export const constructedBy = iri('constructedBy');
export const pipedThrough = iri('pipedThrough');
export const derivedFrom = iri('derivedFrom');
export const argument = iri('argument');
export const apiDependsOn = iri('apiDependsOn');
export const implDependsOn = iri('implDependsOn');
/** A re-exported name and the declaration it stands for: `export { default as X } from './y'`. */
export const aliasOf = iri('aliasOf');
/**
 * The module a namespace symbol publishes: `export * as Ontology from './Ontology.ts'`. The name is
 * a fact of the barrel and the identifiers are facts of the other file, so `canonicalName` — what
 * joins them — can only be concluded by a rule.
 */
export const namespaceOf = iri('namespaceOf');
export const snippet = iri('snippet');
export const doc = iri('doc');
export const deprecated = iri('deprecated');

// SpecBlock properties.
export const blockType = iri('blockType');
export const blockId = iri('blockId');
export const field = iri('field');
export const mentions = iri('mentions');

/**
 * Derived by reasoners, never written by the parser. Reachability over `deus:imports` is
 * deliberately NOT among these: a SPARQL property path (`deus:imports+`) walks it lazily, where a
 * closure rule would recompute and store hundreds of thousands of quads on every pass.
 */
export const usesPackage = iri('usesPackage');
export const usesPackageInApi = iri('usesPackageInApi');
export const undeclaredDependency = iri('undeclaredDependency');
export const unusedDependency = iri('unusedDependency');
export const packagePublic = iri('packagePublic');
export const violatesLayering = iri('violatesLayering');
export const providesService = iri('providesService');
export const requiresService = iri('requiresService');
export const implementsOperation = iri('implementsOperation');
export const bundlesHandler = iri('bundlesHandler');
export const exposesOperation = iri('exposesOperation');
export const describes = iri('describes');
export const undocumented = iri('undocumented');
export const phantom = iri('phantom');
export const tests = iri('tests');
export const importsTestFile = iri('importsTestFile');
export const usesDeprecated = iri('usesDeprecated');
/**
 * The name an external importer writes: the identifier alone, or `<Namespace>.<identifier>` when
 * the declaring module is published whole under one name.
 */
export const canonicalName = iri('canonicalName');

export const type = DataFactory.namedNode(rdf.type);

const id = (term: string) => ({ '@id': `deus:${term}`, '@type': '@id' }) as const;
const integer = (term: string) => ({ '@id': `deus:${term}`, '@type': 'xsd:integer' }) as const;
const boolean = (term: string) => ({ '@id': `deus:${term}`, '@type': 'xsd:boolean' }) as const;

/** The `@context` of every document the indexer emits. */
export const CONTEXT = {
  deus: PREFIX,
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  File: 'deus:File',
  Package: 'deus:Package',
  Symbol: 'deus:Symbol',
  SpecBlock: 'deus:SpecBlock',
  // File.
  path: 'deus:path',
  language: 'deus:language',
  hash: 'deus:hash',
  importsModule: 'deus:importsModule',
  parseError: 'deus:parseError',
  size: integer('size'),
  mtime: integer('mtime'),
  unresolvedReferences: integer('unresolvedReferences'),
  inPackage: id('inPackage'),
  imports: id('imports'),
  importsType: id('importsType'),
  reexports: id('reexports'),
  declares: id('declares'),
  declaresBlock: id('declaresBlock'),
  describesPackage: id('describesPackage'),
  // Package.
  name: 'deus:name',
  version: 'deus:version',
  layer: 'deus:layer',
  packagePath: 'deus:packagePath',
  private: boolean('private'),
  entry: id('entry'),
  declaresDep: id('declaresDep'),
  declaresDevDep: id('declaresDevDep'),
  declaresPeerDep: id('declaresPeerDep'),
  // Symbol.
  kind: 'deus:kind',
  snippet: 'deus:snippet',
  doc: 'deus:doc',
  line: integer('line'),
  exported: boolean('exported'),
  deprecated: boolean('deprecated'),
  extends: id('extends'),
  constructedBy: id('constructedBy'),
  pipedThrough: id('pipedThrough'),
  derivedFrom: id('derivedFrom'),
  argument: id('argument'),
  apiDependsOn: id('apiDependsOn'),
  implDependsOn: id('implDependsOn'),
  aliasOf: id('aliasOf'),
  namespaceOf: id('namespaceOf'),
  // SpecBlock.
  blockType: 'deus:blockType',
  blockId: 'deus:blockId',
  field: 'deus:field',
  mentions: 'deus:mentions',
} as const;

/** The document shapes `design/ONTOLOGY.md` fixes, decoded by the RPC layer on the way in. */
export const SymbolNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Symbol'),
  'name': Schema.String,
  'kind': Schema.String,
  'exported': Schema.Boolean,
  'line': Schema.Number,
  'extends': Schema.Array(Schema.String),
  'constructedBy': Schema.Array(Schema.String),
  'pipedThrough': Schema.Array(Schema.String),
  'derivedFrom': Schema.Array(Schema.String),
  'argument': Schema.Array(Schema.String),
  'apiDependsOn': Schema.Array(Schema.String),
  'implDependsOn': Schema.Array(Schema.String),
  'aliasOf': Schema.Array(Schema.String),
  'namespaceOf': Schema.optional(Schema.Array(Schema.String)),
  'snippet': Schema.optional(Schema.String),
  'doc': Schema.optional(Schema.String),
  'deprecated': Schema.optional(Schema.Boolean),
});

export type SymbolNode = typeof SymbolNode.Type;

export const PackageNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Package'),
  'name': Schema.optional(Schema.String),
  'version': Schema.optional(Schema.String),
  'private': Schema.optional(Schema.Boolean),
  'packagePath': Schema.optional(Schema.String),
  'layer': Schema.optional(Schema.String),
  'entry': Schema.optional(Schema.Array(Schema.String)),
  'declaresDep': Schema.optional(Schema.Array(Schema.String)),
  'declaresDevDep': Schema.optional(Schema.Array(Schema.String)),
  'declaresPeerDep': Schema.optional(Schema.Array(Schema.String)),
});

export type PackageNode = typeof PackageNode.Type;

export const SpecBlockNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('SpecBlock'),
  'blockType': Schema.String,
  'blockId': Schema.optional(Schema.String),
  'name': Schema.optional(Schema.String),
  'field': Schema.Array(Schema.String),
  'mentions': Schema.Array(Schema.String),
  'inPackage': Schema.optional(Schema.String),
});

export type SpecBlockNode = typeof SpecBlockNode.Type;

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
  'inPackage': Schema.optional(Schema.String),
  'imports': Schema.Array(Schema.String),
  'importsType': Schema.Array(Schema.String),
  'importsModule': Schema.Array(Schema.String),
  'reexports': Schema.Array(Schema.String),
  'unresolvedReferences': Schema.optional(Schema.Number),
  'declares': Schema.Array(SymbolNode),
  'describesPackage': Schema.optional(PackageNode),
  'declaresBlock': Schema.optional(Schema.Array(SpecBlockNode)),
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
  'inPackage': { '@id': inPackage.value, '@optional': true },
  'imports': { '@id': imports.value, '@array': true, '@optional': true },
  'importsType': { '@id': importsType.value, '@array': true, '@optional': true },
} as const satisfies LdkitSchema;

export const PackageSchema = {
  '@type': Package.value,
  'name': { '@id': name.value, '@type': xsd.string },
  'version': { '@id': version.value, '@type': xsd.string, '@optional': true },
  'layer': { '@id': layer.value, '@type': xsd.string, '@optional': true },
  'packagePath': { '@id': packagePath.value, '@type': xsd.string, '@optional': true },
  'entry': { '@id': entry.value, '@array': true, '@optional': true },
  'declaresDep': { '@id': declaresDep.value, '@array': true, '@optional': true },
} as const satisfies LdkitSchema;

export const SymbolSchema = {
  '@type': Symbol.value,
  'name': { '@id': name.value, '@type': xsd.string },
  'kind': { '@id': kind.value, '@type': xsd.string },
  'line': { '@id': line.value, '@type': xsd.integer },
  'exported': { '@id': exported.value, '@type': xsd.boolean },
  'snippet': { '@id': snippet.value, '@type': xsd.string, '@optional': true },
  'doc': { '@id': doc.value, '@type': xsd.string, '@optional': true },
  'constructedBy': { '@id': constructedBy.value, '@array': true, '@optional': true },
  'apiDependsOn': { '@id': apiDependsOn.value, '@array': true, '@optional': true },
  'implDependsOn': { '@id': implDependsOn.value, '@array': true, '@optional': true },
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
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};
