//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';
import type { Schema as LdkitSchema } from 'ldkit';
import { rdf, xsd } from 'ldkit/namespaces';
import { DataFactory, type NamedNode } from 'n3';

import { escapeFragment, escapePath } from './internal/iri.ts';

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

/** Type terms are content-addressed: the same type is one node, whichever file asserts it. */
export const TYPE_BASE = 'https://dxos.org/deus/type/';

/** File globs are content-addressed too, so a glob many rule blocks name is matched once. */
export const GLOB_BASE = 'https://dxos.org/deus/glob/';

/** One node per extension URI, however many documents' Extensions tables name it. */
export const EXTENSION_BASE = 'https://dxos.org/deus/extension/';

export const iri = (term: string): NamedNode => DataFactory.namedNode(`${PREFIX}${term}`);

/**
 * Bumped whenever the IRIs the indexer mints change shape. A store written under another version is
 * dropped and rebuilt on open: the ledger keys commits by graph IRI, so mixing schemes would leave
 * graphs no row points at and rules matching only half the facts.
 */
export const VERSION = 4;

/** IRI of a file resource; stable across revisions of that file. */
export const fileIri = (path: string): NamedNode => DataFactory.namedNode(`${FILE_BASE}${escapePath(path)}`);

export const symbolIri = (path: string, name: string): NamedNode =>
  DataFactory.namedNode(`${FILE_BASE}${escapePath(path)}#${escapeFragment(name)}`);

/** IRI of a workspace package, by its `package.json` name. */
export const packageIri = (name: string): NamedNode => DataFactory.namedNode(`${PACKAGE_BASE}${escapePath(name)}`);

/**
 * IRI of a named export of a module *as imported* — `module:effect/Layer#effect`. Follows the
 * specifier written in source, so rules keyed on it survive the implementation file moving.
 */
/** IRI of a module as imported by a bare specifier; `memberIri` addresses its exports. */
export const moduleIri = (specifier: string): NamedNode =>
  DataFactory.namedNode(`${MODULE_BASE}${escapePath(specifier)}`);

export const memberIri = (specifier: string, path: string): NamedNode =>
  DataFactory.namedNode(`${MODULE_BASE}${escapePath(specifier)}#${escapeFragment(path)}`);

/**
 * `<blockType>:<key>`, split on the first `:` — so a `:` is escaped in the block type and nowhere
 * else (a `.mdl` documenting the grammar has a block whose type is `<type>`).
 */
export const specBlockIri = (path: string, blockType: string, key: string): NamedNode =>
  DataFactory.namedNode(
    `${FILE_BASE}${escapePath(path)}#${escapeFragment(blockType).replaceAll(':', '%3A')}:${escapeFragment(key)}`,
  );

/** One field or list item of a spec block, by its dot-joined path: `…#op:create/input.doc`. */
export const specFieldIri = (block: string, path: string): NamedNode =>
  DataFactory.namedNode(`${block}/${escapeFragment(path)}`);

/** One row of a document's Extensions table; `@` cannot open a block type, so it never collides. */
export const extensionUseIri = (path: string, term: string): NamedNode =>
  DataFactory.namedNode(`${FILE_BASE}${escapePath(path)}#@extension/${escapeFragment(term)}`);

/** The block-type definition an Extensions table names by URI (`org.dxos.mdl.op@1.1`). */
export const extensionIri = (uri: string): NamedNode => DataFactory.namedNode(`${EXTENSION_BASE}${escapePath(uri)}`);

/** A glob resolved against the repository root. */
export const globIri = (glob: string): NamedNode => DataFactory.namedNode(`${GLOB_BASE}${escapePath(glob)}`);

/** File graphs and derived graphs get disjoint prefixes, so no file path can name a derived graph. */
export const FILE_GRAPH_PREFIX = `${GRAPH_BASE}file/`;

export const DERIVED_GRAPH_PREFIX = `${GRAPH_BASE}derived/`;

/** IRI of the named graph holding one revision of a file; the mtime makes the swap atomic. */
export const graphIri = (path: string, mtime: number): NamedNode =>
  DataFactory.namedNode(`${FILE_GRAPH_PREFIX}${escapePath(path)}#${mtime}`);

/**
 * The graph holding one reasoner's conclusions. Kept apart from the file graphs so a run can drop
 * the whole of it and recompute — a derived fact must never outlive its premises.
 */
export const derivedGraphIri = (reasoner: string): NamedNode =>
  DataFactory.namedNode(`${DERIVED_GRAPH_PREFIX}${escapePath(reasoner)}`);

export const isDerivedGraph = (graph: string): boolean => graph.startsWith(DERIVED_GRAPH_PREFIX);

/**
 * The graph a JS pass writes. Outside the derived prefix, so both backends take it as a premise of
 * every rule file (the native engine journals it like a file graph); `Reasoner.run` recomputes it
 * before any rule runs, so it never outlives the file graphs it was read from.
 */
export const PASS_GRAPH_PREFIX = `${GRAPH_BASE}pass/`;

export const passGraphIri = (pass: string): NamedNode =>
  DataFactory.namedNode(`${PASS_GRAPH_PREFIX}${escapePath(pass)}`);

export const isFileGraph = (graph: string): boolean => graph.startsWith(FILE_GRAPH_PREFIX);

// Classes asserted by the parser.
export const File = iri('File');
export const Package = iri('Package');
export const Symbol = iri('Symbol');
export const Member = iri('Member');
export const SpecBlock = iri('SpecBlock');
export const SpecField = iri('SpecField');
export const ExtensionUse = iri('ExtensionUse');
export const Extension = iri('Extension');
export const FileGlob = iri('FileGlob');
export const Type = iri('Type');
export const TypeProperty = iri('TypeProperty');

// File properties.
export const path = iri('path');
export const language = iri('language');
export const size = iri('size');
export const mtime = iri('mtime');
export const hash = iri('hash');
export const inPackage = iri('inPackage');
/** `true` on a `*.test.*` or `*.spec.*` script; absent on every other file. */
export const testFile = iri('testFile');
export const imports = iri('imports');
export const importsType = iri('importsType');
export const importsModule = iri('importsModule');
export const reexports = iri('reexports');
export const declares = iri('declares');
export const declaresBlock = iri('declaresBlock');
export const describesPackage = iri('describesPackage');
export const unresolvedReferences = iri('unresolvedReferences');
export const parseError = iri('parseError');
// `.mdl` file properties: the frontmatter and the Extensions table.
export const specId = iri('specId');
export const specName = iri('specName');
export const specVersion = iri('specVersion');
export const specExtends = iri('specExtends');
export const frontmatter = iri('frontmatter');
export const usesExtension = iri('usesExtension');
export const term = iri('term');
export const extension = iri('extension');
export const extensionUri = iri('extensionUri');

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
/** A file the declaration imports dynamically (`() => import('./y')`): what a lazy shim defers. */
export const loads = iri('loads');
/** A reference the declaration passes into a call, as a `deus:Argument` node. */
export const passes = iri('passes');
/** A string literal the declaration passes into a call (slot `"0"`, or `"0.plugin.key"` under object keys), as a `deus:Argument` node. */
export const passesLiteral = iri('passesLiteral');
export const literal = iri('literal');
/** Where an argument sits: `"0"`, or `"1.provides"` for a property of an object-literal argument. */
export const slot = iri('slot');
export const reference = iri('reference');
/** The dotted path left over after the reference's symbol IRI: `NS.Cap` landing on `NS` leaves `Cap`. */
export const referencePath = iri('referencePath');
export const calleePath = iri('calleePath');
/** The same leftover path for the `deus:constructedBy` callee: `Capability$.make` landing on `Capability$`. */
export const constructedByPath = iri('constructedByPath');
export const snippet = iri('snippet');
export const doc = iri('doc');
export const deprecated = iri('deprecated');
/** The type of the value a symbol declares — `design/TYPES.md`. */
export const hasType = iri('hasType');
/** The symbol's type term as JSON, literal freshness included — what the cross-file pass binds. */
export const typeTerm = iri('typeTerm');

// Type term properties (`design/TYPES.md`).
export const typeKind = iri('typeKind');
export const typeText = iri('typeText');
/** A `ref` term's named type, or a `typeof` term's named value. */
export const typeHead = iri('typeHead');
export const typeMember = iri('typeMember');
export const typeProperty = iri('typeProperty');
export const returnType = iri('returnType');
export const literalValue = iri('literalValue');
/** Why inference gave up at an `unresolved` term — the bucket an analyzer improvement moves. */
export const unresolvedReason = iri('unresolvedReason');
/** A `returnOf` term's callee, and the called function of a `deus:Argument`. */
export const callee = iri('callee');
/** Operations a deferred term owes once bound (`widen`, `settle`, `nonNullish`, `noUndefined`). */
export const pending = iri('pending');
/** A bare specifier's module node, and the repository file it resolves to. */
export const moduleFile = iri('moduleFile');
/** The term has an unknown position; its structure facts are then incomplete. */
export const typePartial = iri('typePartial');
export const optional = iri('optional');
export const readonly = iri('readonly');

/** Positional slots are numbered predicates, so a rule matches `deus:typeArg0` directly. */
export const POSITIONS = 8;
export const typeArg = (index: number) => iri(`typeArg${index}`);
export const typeElement = (index: number) => iri(`typeElement${index}`);
export const typeParam = (index: number) => iri(`typeParam${index}`);

// SpecBlock properties.
export const blockType = iri('blockType');
export const blockId = iri('blockId');
export const mentions = iri('mentions');
export const body = iri('body');
export const prose = iri('prose');
export const hasField = iri('hasField');
export const partOf = iri('partOf');

// SpecField properties.
export const key = iri('key');
export const index = iri('index');
export const fieldPath = iri('fieldPath');
export const value = iri('value');
export const refScope = iri('refScope');
export const refTarget = iri('refTarget');
export const refFragment = iri('refFragment');
export const repoGlob = iri('repoGlob');
export const dirGlob = iri('dirGlob');

// FileGlob properties.
export const glob = iri('glob');
export const pathPattern = iri('pathPattern');

/**
 * Derived by reasoners, never written by the parser. Reachability over `deus:imports` is
 * deliberately NOT among these: a SPARQL property path (`deus:imports+`) walks it lazily, where a
 * closure rule would recompute and store hundreds of thousands of quads on every pass.
 */
export const publishedBy = iri('publishedBy');
export const usesPackage = iri('usesPackage');
export const usesPackageInApi = iri('usesPackageInApi');
export const undeclaredDependency = iri('undeclaredDependency');
export const unusedDependency = iri('unusedDependency');
export const packagePublic = iri('packagePublic');
export const violatesLayering = iri('violatesLayering');
export const providesService = iri('providesService');
export const requiresService = iri('requiresService');
/** A layer's `RIn`, read off its inferred type — exact, where `requiresService` is a heuristic. */
export const layerRequires = iri('layerRequires');
/** A reference IRI (`file:<barrel>#X`, `module:<specifier>#X`) and the declaration it denotes — concluded for service keys. */
export const resolvesTo = iri('resolvesTo');
export const implementsOperation = iri('implementsOperation');
/** An ECHO type's typename and version: the literal `DXN.make(typename, version)` it is built from. */
export const echoTypename = iri('echoTypename');
export const echoVersion = iri('echoVersion');
/** The named schema an ECHO type is built from. */
export const echoSchema = iri('echoSchema');
/** An ECHO type naming another in a `Ref.Ref(X)` field. */
export const echoReferences = iri('echoReferences');
/** An ECHO relation's endpoints. */
export const relationSource = iri('relationSource');
export const relationTarget = iri('relationTarget');
export const bundlesHandler = iri('bundlesHandler');
export const exposesOperation = iri('exposesOperation');
/** An `OperationHandlerSet` and each operation it serves: its handlers', its merged sets', its lazy entries'. */
export const handlesOperation = iri('handlesOperation');
/** A symbol whose implementation names an operation — directly, through barrels, or as a namespace member. */
export const referencesOperation = iri('referencesOperation');
/** A reference IRI (re-export, star-barrel name) and the `Operation` declaration it stands for. */
export const denotes = iri('denotes');
/** A file exporting an operation by its bare name: declaring it, or through `export *`. */
export const exportsOperation = iri('exportsOperation');
/** A namespace (`export * as N`, or a re-export of one) whose module declares operations. */
export const operationNamespace = iri('operationNamespace');
/** An operation's `meta.key` literal. */
export const operationKey = iri('operationKey');
/** The named schema an operation's `input` / `output` is, and each service its `services` lists. */
export const operationInput = iri('operationInput');
export const operationOutput = iri('operationOutput');
export const operationRequires = iri('operationRequires');
/** A declaration and each `Capability` it fills (`contribute(X, …)`, `provides: [X]`, its maker's). */
export const contributesCapability = iri('contributesCapability');
/** A helper whose modules contribute a `Capability` (`Capability.moduleMaker(name, X)` and its wrappers). */
export const buildsModuleFor = iri('buildsModuleFor');
/** A `Plugin` and each module it registers with `Plugin.addModule`. */
export const addsModule = iri('addsModule');
/** A `Plugin` or `LazyPlugin` and the `PluginMeta` it is defined with. */
export const pluginMeta = iri('pluginMeta');
/** The plugin key string (`org.dxos.plugin.chess`), on a `PluginMeta` and the plugins defined with it. */
export const pluginId = iri('pluginId');
/** A `LazyPlugin` and the `Plugin` body it defers loading. */
export const loadsPlugin = iri('loadsPlugin');
/** A `Package` and each `Plugin` declared in it. */
export const definesPlugin = iri('definesPlugin');

export const importsTestFile = iri('importsTestFile');

// Derived from specs (`rules/70-specs.n3`, `rules/80-gaps.n3`).
export const OpSpec = iri('OpSpec');
export const TypeSpec = iri('TypeSpec');
export const ComponentSpec = iri('ComponentSpec');
export const FeatureSpec = iri('FeatureSpec');
export const Requirement = iri('Requirement');
export const Scenario = iri('Scenario');
export const QaTest = iri('QaTest');
export const QaSuite = iri('QaSuite');
export const ReviewRule = iri('ReviewRule');
export const ModuleSpec = iri('ModuleSpec');
export const ServiceSpec = iri('ServiceSpec');
export const SurfaceSpec = iri('SurfaceSpec');
export const ExtensionSpec = iri('ExtensionSpec');
export const SelectedGlob = iri('SelectedGlob');
export const specifies = iri('specifies');
export const describes = iri('describes');
export const covers = iri('covers');
export const includesTest = iri('includesTest');
export const automatedBy = iri('automatedBy');
export const selectsGlob = iri('selectsGlob');
export const matchesGlob = iri('matchesGlob');
export const hasSpec = iri('hasSpec');
export const schema = iri('schema');
export const declaresField = iri('declaresField');
export const requiresField = iri('requiresField');
export const hasKey = iri('hasKey');
export const unknownField = iri('unknownField');
export const missingField = iri('missingField');
export const violatesSchema = iri('violatesSchema');
export const undocumented = iri('undocumented');
export const phantom = iri('phantom');
export const unspecified = iri('unspecified');
/**
 * The name an external importer writes, stated only when it is not the declared name:
 * `<Namespace>.<identifier>` when the declaring module is published whole under one name. Otherwise
 * it is `deus:name` — `COALESCE(?canonical, ?name)` in a query.
 */
export const canonicalName = iri('canonicalName');

export const type = DataFactory.namedNode(rdf.type);

const id = (term: string) => ({ '@id': `deus:${term}`, '@type': '@id' }) as const;
const integer = (term: string) => ({ '@id': `deus:${term}`, '@type': 'xsd:integer' }) as const;
const boolean = (term: string) => ({ '@id': `deus:${term}`, '@type': 'xsd:boolean' }) as const;

const positional = (prefix: string) =>
  Object.fromEntries(Array.from({ length: POSITIONS }, (_, index) => [`${prefix}${index}`, id(`${prefix}${index}`)]));

/** The `@context` of every document the indexer emits. */
export const CONTEXT = {
  deus: PREFIX,
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  File: 'deus:File',
  Package: 'deus:Package',
  Symbol: 'deus:Symbol',
  SpecBlock: 'deus:SpecBlock',
  SpecField: 'deus:SpecField',
  ExtensionUse: 'deus:ExtensionUse',
  Extension: 'deus:Extension',
  FileGlob: 'deus:FileGlob',
  // File.
  path: 'deus:path',
  language: 'deus:language',
  hash: 'deus:hash',
  testFile: boolean('testFile'),
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
  specId: 'deus:specId',
  specName: 'deus:specName',
  specVersion: 'deus:specVersion',
  specExtends: 'deus:specExtends',
  frontmatter: 'deus:frontmatter',
  usesExtension: id('usesExtension'),
  term: 'deus:term',
  extension: id('extension'),
  extensionUri: 'deus:extensionUri',
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
  loads: id('loads'),
  passes: id('passes'),
  passesLiteral: id('passesLiteral'),
  literal: 'deus:literal',
  Argument: 'deus:Argument',
  reference: id('reference'),
  slot: 'deus:slot',
  referencePath: 'deus:referencePath',
  calleePath: 'deus:calleePath',
  constructedByPath: 'deus:constructedByPath',
  hasType: id('hasType'),
  typeTerm: 'deus:typeTerm',
  unresolvedReason: 'deus:unresolvedReason',
  pending: 'deus:pending',
  callee: id('callee'),
  moduleFile: id('moduleFile'),
  // Type terms.
  Type: 'deus:Type',
  TypeProperty: 'deus:TypeProperty',
  Module: 'deus:Module',
  typeKind: 'deus:typeKind',
  typeText: 'deus:typeText',
  literalValue: 'deus:literalValue',
  typeHead: id('typeHead'),
  typeMember: id('typeMember'),
  typeProperty: id('typeProperty'),
  returnType: id('returnType'),
  typePartial: boolean('typePartial'),
  optional: boolean('optional'),
  readonly: boolean('readonly'),
  ...positional('typeArg'),
  ...positional('typeElement'),
  ...positional('typeParam'),
  // SpecBlock.
  blockType: 'deus:blockType',
  blockId: 'deus:blockId',
  mentions: 'deus:mentions',
  body: 'deus:body',
  prose: 'deus:prose',
  hasField: id('hasField'),
  partOf: id('partOf'),
  // SpecField.
  key: 'deus:key',
  index: integer('index'),
  fieldPath: 'deus:fieldPath',
  value: 'deus:value',
  refScope: 'deus:refScope',
  refTarget: 'deus:refTarget',
  refFragment: 'deus:refFragment',
  repoGlob: id('repoGlob'),
  dirGlob: id('dirGlob'),
  // FileGlob.
  glob: 'deus:glob',
  pathPattern: 'deus:pathPattern',
} as const;

/** One reference passed into a call — see `deus:passes`. */
export const ArgumentNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Argument'),
  'callee': Schema.Array(Schema.String),
  'calleePath': Schema.optional(Schema.String),
  'slot': Schema.String,
  'reference': Schema.Array(Schema.String),
  'referencePath': Schema.optional(Schema.String),
});

export type ArgumentNode = typeof ArgumentNode.Type;

/** One string literal passed into a call — see `deus:passesLiteral`. */
export const LiteralArgumentNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Argument'),
  'callee': Schema.Array(Schema.String),
  'calleePath': Schema.optional(Schema.String),
  'slot': Schema.String,
  'literal': Schema.String,
});

export type LiteralArgumentNode = typeof LiteralArgumentNode.Type;

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
  'constructedByPath': Schema.optional(Schema.String),
  'pipedThrough': Schema.Array(Schema.String),
  'derivedFrom': Schema.Array(Schema.String),
  'argument': Schema.Array(Schema.String),
  'apiDependsOn': Schema.Array(Schema.String),
  'implDependsOn': Schema.Array(Schema.String),
  'aliasOf': Schema.Array(Schema.String),
  'namespaceOf': Schema.optional(Schema.Array(Schema.String)),
  'loads': Schema.optional(Schema.Array(Schema.String)),
  'passes': Schema.optional(Schema.Array(ArgumentNode)),
  'passesLiteral': Schema.optional(Schema.Array(LiteralArgumentNode)),
  'snippet': Schema.optional(Schema.String),
  'doc': Schema.optional(Schema.String),
  'deprecated': Schema.optional(Schema.Boolean),
  'hasType': Schema.optional(Schema.String),
  'typeTerm': Schema.optional(Schema.String),
});

export type SymbolNode = typeof SymbolNode.Type;

const positionalFields = (prefix: string) =>
  Object.fromEntries(
    Array.from({ length: POSITIONS }, (_, index) => [`${prefix}${index}`, Schema.optional(Schema.String)]),
  );

/** One type term node; structure is spelled out with IRIs of other nodes (`design/TYPES.md`). */
export const TypeNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Type'),
  'typeKind': Schema.String,
  'typeText': Schema.String,
  'typeHead': Schema.optional(Schema.String),
  'typeMember': Schema.optional(Schema.Array(Schema.String)),
  'typeProperty': Schema.optional(Schema.Array(Schema.String)),
  'returnType': Schema.optional(Schema.String),
  'literalValue': Schema.optional(Schema.String),
  'typePartial': Schema.optional(Schema.Boolean),
  'callee': Schema.optional(Schema.String),
  'pending': Schema.optional(Schema.String),
  'unresolvedReason': Schema.optional(Schema.String),
  ...positionalFields('typeArg'),
  ...positionalFields('typeElement'),
  ...positionalFields('typeParam'),
});

export type TypeNode = typeof TypeNode.Type;

/** A property of an object type term: its own node, so its name and type are matchable. */
export const TypePropertyNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('TypeProperty'),
  'name': Schema.String,
  'hasType': Schema.optional(Schema.String),
  'optional': Schema.optional(Schema.Literal(true)),
  'readonly': Schema.optional(Schema.Literal(true)),
});

export type TypePropertyNode = typeof TypePropertyNode.Type;

/** A bare specifier that resolves inside the repository, and the file it resolves to. */
export const ModuleNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Module'),
  'moduleFile': Schema.String,
});

export type ModuleNode = typeof ModuleNode.Type;

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

/** A path glob compiled to an anchored regular expression over `deus:path`. */
export const FileGlobNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('FileGlob'),
  'glob': Schema.String,
  'pathPattern': Schema.String,
});

export type FileGlobNode = typeof FileGlobNode.Type;

/** A field or list item; its children nest, so the tree is the document's own. */
export interface SpecFieldNode {
  readonly '@id': string;
  readonly '@type': 'SpecField';
  readonly 'key'?: string;
  readonly 'index'?: number;
  readonly 'fieldPath': string;
  readonly 'value'?: string;
  readonly 'optional'?: boolean;
  readonly 'line': number;
  readonly 'refScope'?: string;
  readonly 'refTarget'?: string;
  readonly 'refFragment'?: string;
  readonly 'repoGlob'?: FileGlobNode;
  readonly 'dirGlob'?: FileGlobNode;
  readonly 'hasField'?: readonly SpecFieldNode[];
}

export const SpecFieldNode: Schema.Codec<SpecFieldNode> = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('SpecField'),
  'key': Schema.optional(Schema.String),
  'index': Schema.optional(Schema.Number),
  'fieldPath': Schema.String,
  'value': Schema.optional(Schema.String),
  'optional': Schema.optional(Schema.Boolean),
  'line': Schema.Number,
  'refScope': Schema.optional(Schema.String),
  'refTarget': Schema.optional(Schema.String),
  'refFragment': Schema.optional(Schema.String),
  'repoGlob': Schema.optional(FileGlobNode),
  'dirGlob': Schema.optional(FileGlobNode),
  'hasField': Schema.optional(Schema.Array(Schema.suspend((): Schema.Codec<SpecFieldNode> => SpecFieldNode))),
});

export const SpecBlockNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('SpecBlock'),
  'blockType': Schema.String,
  'blockId': Schema.optional(Schema.String),
  'name': Schema.optional(Schema.String),
  'line': Schema.Number,
  'body': Schema.String,
  'prose': Schema.optional(Schema.String),
  'mentions': Schema.Array(Schema.String),
  'hasField': Schema.Array(SpecFieldNode),
  'partOf': Schema.optional(Schema.String),
  'inPackage': Schema.optional(Schema.String),
});

export type SpecBlockNode = typeof SpecBlockNode.Type;

/** Content-addressed by URI, so the `ext` copies of one URI meet on one node. */
export const ExtensionNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('Extension'),
  'extensionUri': Schema.String,
});

export type ExtensionNode = typeof ExtensionNode.Type;

export const ExtensionUseNode = Schema.Struct({
  '@id': Schema.String,
  '@type': Schema.Literal('ExtensionUse'),
  'term': Schema.String,
  'extension': ExtensionNode,
});

export type ExtensionUseNode = typeof ExtensionUseNode.Type;

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
  'testFile': Schema.optional(Schema.Boolean),
  'imports': Schema.Array(Schema.String),
  'importsType': Schema.Array(Schema.String),
  'importsModule': Schema.Array(Schema.String),
  'reexports': Schema.Array(Schema.String),
  'unresolvedReferences': Schema.optional(Schema.Number),
  'declares': Schema.Array(SymbolNode),
  'describesPackage': Schema.optional(PackageNode),
  'declaresBlock': Schema.optional(Schema.Array(SpecBlockNode)),
  'specId': Schema.optional(Schema.String),
  'specName': Schema.optional(Schema.String),
  'specVersion': Schema.optional(Schema.String),
  'specExtends': Schema.optional(Schema.Array(Schema.String)),
  'frontmatter': Schema.optional(Schema.Array(Schema.String)),
  'usesExtension': Schema.optional(Schema.Array(ExtensionUseNode)),
  'parseError': Schema.optional(Schema.Array(Schema.String)),
  // Type terms the symbols' `hasType` point at: graph content with no edge from the file itself.
  '@included': Schema.optional(Schema.Array(Schema.Union([TypeNode, TypePropertyNode, ModuleNode]))),
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
 * `file:` or `graph:` emits prefixed names whose local part is a path, and a path beginning with
 * `.` (`.agents/...`) or holding an `@` is not a legal PNAME — the writer emits it anyway and no
 * parser reads it back.
 */
export const prefixes: Record<string, string> = {
  deus: PREFIX,
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};
