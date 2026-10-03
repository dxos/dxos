//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Ontology from '../Ontology.ts';

/**
 * What each `deus:` term means, as `design/ONTOLOGY.md` documents it, so `vocabulary` can say what
 * a predicate relates rather than only that it exists. ONTOLOGY.md stays the source of truth;
 * `Terms.test.ts` fails when a term the rules or the indexer use is missing here or there.
 */

export type Term = {
  readonly kind: 'class' | 'property';
  readonly description: string;
  /** The class of the subject a property is stated on, or the class a class refines. */
  readonly subjectClass?: string;
  /** The class or datatype of a property's object. */
  readonly range?: string;
};

const cls = (description: string, subjectClass?: string): Term => ({ kind: 'class', description, subjectClass });

const prop = (subjectClass: string, range: string, description: string): Term => ({
  kind: 'property',
  description,
  subjectClass,
  range,
});

const SYMBOL_OR_MEMBER = 'deus:Symbol | deus:Member';

const positional = (prefix: string, subjectClass: string, description: (index: number) => string) =>
  Object.fromEntries(
    Array.from({ length: Ontology.POSITIONS }, (_, index) => [
      `${prefix}${index}`,
      prop(subjectClass, 'deus:Type', description(index)),
    ]),
  );

export const TERMS: Readonly<Record<string, Term>> = {
  // Classes asserted by the parser.
  File: cls('One indexed file in the repository.'),
  Package: cls('A workspace package (one package.json).'),
  Symbol: cls('A top-level declaration in a file (function, class, variable, type, …).'),
  Member: cls('A named export of a module as imported: module:effect/Layer#effect, module:@dxos/echo#Type.Obj.'),
  Argument: cls('One reference or string literal a declaration passes into a call (deus:passes, deus:passesLiteral).'),
  Module: cls('Where a bare import specifier resolves inside the repository (deus:moduleFile).'),
  SpecBlock: cls('One block of a .mdl document (a fence may hold several).'),
  SpecField: cls('One field or list item of a spec block, nested as written.'),
  ExtensionUse: cls("One row of a .mdl document's Extensions table: a block type and its URI."),
  Extension: cls('A block-type definition named by URI, shared by every table naming it.'),
  FileGlob: cls('A path glob a spec field names, compiled to a regular expression (deus:pathPattern).'),
  Type: cls('A type term inferred for a variable or function symbol; the IRI hashes its canonical text.'),
  TypeProperty: cls('One property of an object type term: deus:name, deus:hasType, deus:optional, deus:readonly.'),

  // Classes derived by the framework rules.
  EffectService: cls('extends module:effect/Context#Service (rules/10-effect.n3).', 'deus:Symbol'),
  EffectLayer: cls(
    'Constructed by Layer.effect/succeed/scoped/mergeAll/unwrap/provide, or typed Layer (rules/10-effect.n3, 15-types.n3).',
    'deus:Symbol',
  ),
  Schema: cls('Constructed by Schema.Struct/TaggedStruct/Class/Union/… (rules/10-effect.n3).', 'deus:Symbol'),
  DomainError: cls('extends BaseError.extend or Data.TaggedError (rules/10-effect.n3).', 'deus:Symbol'),
  Rpc: cls('Constructed by RpcGroup.make (rules/10-effect.n3).', 'deus:Symbol'),
  EchoType: cls('An ECHO object type: built by Type.makeObject (rules/20-echo.n3).', 'deus:Symbol'),
  EchoRelation: cls('An ECHO relation type: built by Type.makeRelation (rules/20-echo.n3).', 'deus:Symbol'),
  Operation: cls('Constructed by Operation.make (rules/30-compute.n3).', 'deus:Symbol'),
  OperationHandler: cls(
    'An operation with a handler attached: Operation.withHandler / lazyHandler, or a default-exported handler (rules/30-compute.n3).',
    'deus:Symbol',
  ),
  OperationHandlerSet: cls(
    'Constructed by OperationHandlerSet.make/merge/lazy/reactive (rules/30-compute.n3).',
    'deus:Symbol',
  ),
  Skill: cls('Constructed by Skill.make, or typed Skill.Definition (rules/30-compute.n3).', 'deus:Symbol'),
  Plugin: cls('A plugin body: constructed by Plugin.define (rules/40-composer.n3).', 'deus:Symbol'),
  LazyPlugin: cls(
    'Constructed by Plugin.lazy: the shim that defers loading the body (rules/40-composer.n3).',
    'deus:Symbol',
  ),
  PluginMeta: cls('Constructed by Plugin.getMetaFromConfig / makeMeta (rules/40-composer.n3).', 'deus:Symbol'),
  PluginModule: cls(
    'A capability module: built by Capability.makeModule/lazyModule/inlineModule or by a helper that returns Capability.Module (rules/40-composer.n3).',
    'deus:Symbol',
  ),
  Capability: cls('Constructed by Capability.make / makeSingleton (rules/41-capabilities.n3).', 'deus:Symbol'),
  EchoDxnFactory: cls(
    'Rule-internal marker: the DXN.make members whose literals name an ECHO typename (rules/20-echo.n3).',
    'deus:Member',
  ),
  EchoRefFactory: cls(
    'Rule-internal marker: the Ref.Ref members a reference field is built with (rules/20-echo.n3).',
    'deus:Member',
  ),

  // Classes derived from spec blocks (rules/70-specs.n3), by deus:blockType.
  OpSpec: cls('A spec block of type op.', 'deus:SpecBlock'),
  TypeSpec: cls('A spec block of type type.', 'deus:SpecBlock'),
  ComponentSpec: cls('A spec block of type component.', 'deus:SpecBlock'),
  FeatureSpec: cls('A spec block of type feat.', 'deus:SpecBlock'),
  Requirement: cls('A spec block of type req.', 'deus:SpecBlock'),
  Scenario: cls('A spec block of type scenario.', 'deus:SpecBlock'),
  ExtensionSpec: cls('A spec block of type ext.', 'deus:SpecBlock'),
  QaTest: cls('A spec block of type test.', 'deus:SpecBlock'),
  QaSuite: cls('A spec block of type suite.', 'deus:SpecBlock'),
  ReviewRule: cls('A spec block of type rule.', 'deus:SpecBlock'),
  ModuleSpec: cls('A spec block of type module.', 'deus:SpecBlock'),
  ServiceSpec: cls('A spec block of type service.', 'deus:SpecBlock'),
  SurfaceSpec: cls('A spec block of type surface.', 'deus:SpecBlock'),
  SelectedGlob: cls('A FileGlob some rule block selects — the only globs matched against every path.', 'deus:FileGlob'),

  // File.
  path: prop('deus:File', 'xsd:string', 'Repository-relative path, POSIX separators.'),
  language: prop('deus:File', 'xsd:string', 'typescript, javascript, json, yaml, markdown, mdl or other.'),
  size: prop('deus:File', 'xsd:integer', 'Bytes.'),
  mtime: prop('deus:File', 'xsd:integer', 'Modification time, epoch milliseconds.'),
  hash: prop('deus:File', 'xsd:string', 'SHA-256 of the contents, hex.'),
  inPackage: prop('deus:File | deus:SpecBlock', 'deus:Package', 'Nearest enclosing package.json.'),
  testFile: prop('deus:File', 'xsd:boolean', 'true on a *.test.* / *.spec.* script; absent otherwise.'),
  imports: prop('deus:File', 'deus:File', 'Resolved import used at runtime (value position).'),
  importsType: prop('deus:File', 'deus:File', 'Resolved import used only in type positions, or written import type.'),
  importsModule: prop(
    'deus:File',
    'xsd:string',
    'Unresolved import specifier, verbatim (bare package, virtual module, missing file).',
  ),
  reexports: prop(
    'deus:File',
    'deus:File',
    'export * from / export { x } from — the edge public-API reachability follows.',
  ),
  declares: prop('deus:File', 'deus:Symbol', 'A top-level declaration the file introduces.'),
  describesPackage: prop(
    'deus:File',
    'deus:Package',
    'The package a package.json or moon.yml file states facts about.',
  ),
  unresolvedReferences: prop(
    'deus:File',
    'xsd:integer',
    'Identifier references the resolver could not bind; a quality gauge.',
  ),
  parseError: prop('deus:File', 'xsd:string', 'One message per parse diagnostic; present only on failure.'),
  specId: prop('deus:File', 'xsd:string', 'A .mdl frontmatter id — the document URI other documents extend.'),
  specName: prop('deus:File', 'xsd:string', 'A .mdl frontmatter name.'),
  specVersion: prop('deus:File', 'xsd:string', 'A .mdl frontmatter version.'),
  specExtends: prop('deus:File', 'xsd:string', 'Each .mdl frontmatter extends URI.'),
  frontmatter: prop('deus:File', 'xsd:string', 'Every other .mdl frontmatter key, as key=value.'),
  usesExtension: prop('deus:File', 'deus:ExtensionUse', "A row of a .mdl document's Extensions table."),
  declaresBlock: prop('deus:File', 'deus:SpecBlock', 'Every block of a .mdl document, nested ones included.'),
  term: prop('deus:ExtensionUse', 'xsd:string', 'The block type an Extensions-table row names.'),
  extension: prop(
    'deus:ExtensionUse',
    'deus:Extension',
    'The Extension node of the URI an Extensions-table row names.',
  ),
  extensionUri: prop('deus:Extension', 'xsd:string', "The extension's URI."),

  // Package.
  name: prop(
    'deus:Package | deus:Symbol | deus:SpecBlock | deus:TypeProperty',
    'xsd:string',
    'The declared name (package.json name, symbol name, block name).',
  ),
  version: prop('deus:Package', 'xsd:string', 'package.json version.'),
  private: prop('deus:Package', 'xsd:boolean', 'package.json private.'),
  layer: prop('deus:Package', 'xsd:string', 'moon layer: tool, library, application, …'),
  entry: prop('deus:Package', 'deus:File', 'One per export-map subpath: the source condition if present, else types.'),
  declaresDep: prop('deus:Package', 'deus:Package', 'A workspace dependency (dependencies).'),
  declaresDevDep: prop('deus:Package', 'deus:Package', 'A workspace devDependency.'),
  declaresPeerDep: prop('deus:Package', 'deus:Package', 'A workspace peerDependency.'),
  packagePath: prop('deus:Package', 'xsd:string', 'Directory of the package.json, repository-relative.'),

  // Symbol.
  kind: prop(
    'deus:Symbol',
    'xsd:string',
    'function, class, variable, type, interface, enum, namespace, reexport (an alias symbol of export { x } from) or unknown.',
  ),
  exported: prop('deus:Symbol', 'xsd:boolean', 'Module-public: the declaration leaves its module.'),
  line: prop('deus:Symbol | deus:SpecBlock | deus:SpecField', 'xsd:integer', '1-based line of the declaration.'),
  extends: prop('deus:Symbol', SYMBOL_OR_MEMBER, 'Heritage clause target; when the clause is a call, the callee.'),
  constructedBy: prop(
    'deus:Symbol',
    SYMBOL_OR_MEMBER,
    'The callee when the initializer is a call (the innermost call of a .pipe chain).',
  ),
  constructedByPath: prop(
    'deus:Symbol',
    'xsd:string',
    'The dotted path the deus:constructedBy symbol IRI did not consume.',
  ),
  pipedThrough: prop('deus:Symbol', SYMBOL_OR_MEMBER, 'Callees applied via .pipe(...) to the constructed value.'),
  derivedFrom: prop(
    'deus:Symbol',
    SYMBOL_OR_MEMBER,
    'The base of a .pipe chain when it is a reference rather than a call.',
  ),
  argument: prop(
    'deus:Symbol',
    SYMBOL_OR_MEMBER,
    'The first argument of the constructing call, when it is an identifier reference.',
  ),
  passes: prop('deus:Symbol', 'deus:Argument', 'A reference this declaration passes into a call anywhere in its span.'),
  passesLiteral: prop(
    'deus:Symbol',
    'deus:Argument',
    'A string literal this declaration passes into a call outside any function body.',
  ),
  apiDependsOn: prop('deus:Symbol', SYMBOL_OR_MEMBER, 'A reference from a type position of this declaration.'),
  implDependsOn: prop('deus:Symbol', SYMBOL_OR_MEMBER, 'A reference from a value position (body, initializer).'),
  aliasOf: prop(
    'deus:Symbol',
    'deus:Symbol',
    "A re-exported name and the declaration it stands for (export { x } from, export { default as X } from); rules/90-aliases.n3 copies the origin's classes onto it.",
  ),
  namespaceOf: prop(
    'deus:Symbol',
    'deus:File',
    'On a namespace symbol from export * as N from: the module it publishes whole.',
  ),
  loads: prop('deus:Symbol', 'deus:File', 'A file the declaration imports dynamically (() => import(...)).'),
  snippet: prop('deus:Symbol', 'xsd:string', 'The definition with implementation abbreviated — valid TypeScript.'),
  doc: prop('deus:Symbol', 'xsd:string', 'The JSDoc summary (first paragraph).'),
  deprecated: prop('deus:Symbol', 'xsd:boolean', 'A @deprecated tag is present.'),
  hasType: prop(
    'deus:Symbol | deus:TypeProperty',
    'deus:Type',
    'The type of the value a variable or function declares.',
  ),
  typeTerm: prop('deus:Symbol', 'xsd:string', "The symbol's type term as JSON — what the bind-types pass binds."),

  // Argument.
  callee: prop(
    'deus:Argument | deus:Type',
    SYMBOL_OR_MEMBER,
    "The called function (and a returnOf type term's callee).",
  ),
  calleePath: prop('deus:Argument', 'xsd:string', "Path left over after the callee's symbol IRI."),
  slot: prop(
    'deus:Argument',
    'xsd:string',
    'Where the argument sits: "0", "1", or "1.provides" for a property of an object argument.',
  ),
  reference: prop('deus:Argument', SYMBOL_OR_MEMBER, 'What the argument references.'),
  referencePath: prop('deus:Argument', 'xsd:string', "Path left over after the reference's symbol IRI."),
  literal: prop('deus:Argument', 'xsd:string', 'On a deus:passesLiteral argument: the string as written.'),

  // Type terms.
  typeKind: prop(
    'deus:Type',
    'xsd:string',
    'primitive, literal, ref, typeof, union, intersection, object, tuple, function, param, unresolved, returnOf.',
  ),
  typeText: prop('deus:Type', 'xsd:string', 'The canonical text: equal types, equal text. Symbols appear as <iri>.'),
  typePartial: prop('deus:Type', 'xsd:boolean', 'Some position is unknown; the structure facts are incomplete.'),
  typeHead: prop('deus:Type', `${SYMBOL_OR_MEMBER} | lib:`, 'The named type (ref) or value (typeof).'),
  ...positional('typeArg', 'deus:Type', (index) => `Type argument ${index} of a ref term.`),
  ...positional('typeElement', 'deus:Type', (index) => `Element ${index} of a tuple term.`),
  ...positional('typeParam', 'deus:Type', (index) => `Parameter ${index} of a function term.`),
  returnType: prop('deus:Type', 'deus:Type', 'The return type of a function term.'),
  typeMember: prop('deus:Type', 'deus:Type', 'Each member of a union or intersection term.'),
  typeProperty: prop('deus:Type', 'deus:TypeProperty', 'A property of an object term.'),
  literalValue: prop('deus:Type', 'xsd:string', 'The literal of a literal term, as written in the canonical text.'),
  unresolvedReason: prop('deus:Type', 'xsd:string', 'Why inference gave up at an unresolved term.'),
  pending: prop(
    'deus:Type',
    'xsd:string',
    'An operation a deferred term owes once bound (widen, settle, nonNullish, noUndefined).',
  ),
  optional: prop(
    'deus:TypeProperty | deus:SpecField',
    'xsd:boolean',
    'An optional property, or a field written key?:.',
  ),
  readonly: prop('deus:TypeProperty', 'xsd:boolean', 'A readonly property.'),
  moduleFile: prop('deus:Module', 'deus:File', 'The repository file a bare specifier resolves to.'),

  // SpecBlock.
  blockType: prop(
    'deus:SpecBlock',
    'xsd:string',
    "The block's first token: module, type, feat, req, test, op, rule, ext, …",
  ),
  blockId: prop('deus:SpecBlock', 'xsd:string', 'The id when present (F-1, QA-3, smoke).'),
  body: prop('deus:SpecBlock', 'xsd:string', 'The source below the header, dedented.'),
  prose: prop('deus:SpecBlock', 'xsd:string', 'Body lines that are neither fields nor nested blocks.'),
  hasField: prop('deus:SpecBlock | deus:SpecField', 'deus:SpecField', 'Each top-level field, or each child entry.'),
  partOf: prop('deus:SpecBlock', 'deus:SpecBlock', 'The block a nested block sits in.'),
  mentions: prop('deus:SpecBlock', 'xsd:string', "Every backticked identifier in the block's own lines."),

  // SpecField and FileGlob.
  key: prop('deus:SpecField', 'xsd:string', 'The key, ? removed. Absent on a list item.'),
  index: prop('deus:SpecField', 'xsd:integer', "A list item's position."),
  fieldPath: prop(
    'deus:SpecField',
    'xsd:string',
    'Keys and indices from the block down, dot-joined: input.doc, steps.0.name.',
  ),
  value: prop('deus:SpecField', 'xsd:string', 'The scalar text.'),
  refScope: prop('deus:SpecField', 'xsd:string', 'For a value written <scope>:<target>[#<fragment>]: the scope.'),
  refTarget: prop('deus:SpecField', 'xsd:string', 'The target of such a reference.'),
  refFragment: prop('deus:SpecField', 'xsd:string', 'Its fragment, when present.'),
  repoGlob: prop(
    'deus:SpecField',
    'deus:FileGlob',
    'On a value under a files key: the glob resolved against the repository root.',
  ),
  dirGlob: prop('deus:SpecField', 'deus:FileGlob', "The same glob resolved against the document's directory."),
  glob: prop('deus:FileGlob', 'xsd:string', 'The resolved glob.'),
  pathPattern: prop('deus:FileGlob', 'xsd:string', 'An anchored regular expression over deus:path.'),

  // Derived: compute (rules/30-compute.n3).
  computeRole: prop(
    'deus:Member | deus:Symbol',
    'xsd:string',
    'Rule-internal fact: which compute API a callee IRI is ("operation", "handler", "handlerSet", …), stated by rules/30-compute.n3.',
  ),
  implementsOperation: prop('deus:Symbol', 'deus:Symbol', 'An OperationHandler and the Operation it is built from.'),
  bundlesHandler: prop('deus:Symbol', 'deus:Symbol', 'An OperationHandlerSet and a handler it names.'),
  exposesOperation: prop('deus:Symbol', 'deus:Symbol', 'A Skill and each operation passed to Skill.toolDefinitions.'),
  handlesOperation: prop('deus:Symbol', 'deus:Symbol', 'An OperationHandlerSet and each operation it serves.'),
  referencesOperation: prop('deus:Symbol', 'deus:Symbol', 'A symbol whose implementation names an operation.'),
  denotes: prop(
    SYMBOL_OR_MEMBER,
    'deus:Symbol',
    'A reference IRI (re-export, star-barrel name) and the Operation declaration it stands for.',
  ),
  exportsOperation: prop('deus:File', 'deus:Symbol', 'A file exporting an operation by its bare name.'),
  operationNamespace: prop(
    'deus:Symbol',
    'deus:File',
    'A namespace symbol and the module it publishes, when that module declares operations.',
  ),
  operationKey: prop('deus:Symbol', 'xsd:string', "An Operation's meta.key, e.g. org.dxos.operation.markdown.create."),
  operationInput: prop('deus:Symbol', SYMBOL_OR_MEMBER, "The named schema at an operation's input."),
  operationOutput: prop('deus:Symbol', SYMBOL_OR_MEMBER, "The named schema at an operation's output."),
  operationRequires: prop('deus:Symbol', SYMBOL_OR_MEMBER, "Each service named in an operation's services."),

  // Derived: composer and capabilities (rules/40-composer.n3, 41-capabilities.n3).
  contributesCapability: prop('deus:Symbol', 'deus:Symbol', 'A declaration and each Capability it fills.'),
  buildsModuleFor: prop('deus:Symbol', 'deus:Symbol', 'A helper whose modules contribute a Capability.'),
  addsModule: prop('deus:Symbol', 'deus:Symbol', 'A Plugin and each PluginModule it registers with Plugin.addModule.'),
  pluginMeta: prop('deus:Symbol', 'deus:Symbol', 'A Plugin or LazyPlugin and the PluginMeta it is defined with.'),
  pluginId: prop(
    'deus:Symbol',
    'xsd:string',
    'The plugin key (org.dxos.plugin.markdown), on a PluginMeta and its plugins.',
  ),
  loadsPlugin: prop('deus:Symbol', 'deus:Symbol', 'A LazyPlugin and the Plugin body it defers loading.'),
  definesPlugin: prop('deus:Package', 'deus:Symbol', 'A Package and each Plugin declared in it.'),

  // Derived: ECHO (rules/20-echo.n3).
  echoTypename: prop('deus:Symbol', 'xsd:string', "An ECHO type's typename: slot 0 of its DXN.make(…)."),
  echoVersion: prop('deus:Symbol', 'xsd:string', "An ECHO type's version: slot 1 of its DXN.make(…)."),
  echoSchema: prop('deus:Symbol', 'deus:Symbol', 'The named schema an ECHO type is built from.'),
  echoReferences: prop('deus:Symbol', 'deus:Symbol', 'An ECHO type and each ECHO type a Ref.Ref(X) field names.'),
  relationSource: prop('deus:Symbol', 'deus:Symbol', "An EchoRelation's source endpoint."),
  relationTarget: prop('deus:Symbol', 'deus:Symbol', "An EchoRelation's target endpoint."),
  echoFactoryOf: prop(
    'deus:Member | deus:Symbol',
    'rdfs:Class',
    'Rule-internal fact: a Type.makeObject/makeRelation IRI and the class it builds.',
  ),
  echoClass: prop('rdfs:Class', 'xsd:boolean', 'Rule-internal fact: true on EchoType and EchoRelation.'),
  echoDxnOf: prop(
    'xsd:string',
    'deus:Symbol',
    'Rule-internal helper: a typename literal and the declaration passing it to DXN.make.',
  ),
  echoDxnVersionOf: prop(
    'xsd:string',
    'deus:Symbol',
    'Rule-internal helper: a version literal and the declaration passing it to DXN.make.',
  ),
  echoDenotes: prop(
    'deus:Argument',
    'deus:Symbol',
    'Rule-internal helper: an argument and the declaration its reference resolves to.',
  ),
  echoIsSchema: prop('deus:Symbol', 'xsd:boolean', 'Rule-internal helper: a Schema or a refinement of one.'),
  echoRefines: prop(
    'deus:Symbol',
    'deus:Symbol',
    'Rule-internal helper: a schema and each schema it is derived from (reflexive).',
  ),
  echoBarrelOf: prop('deus:File', 'deus:File', 'Rule-internal helper: a barrel and a file it imports.'),
  echoMemberName: prop('deus:Member', 'rdf:List', 'Rule-internal helper: a member IRI split into (package name).'),
  echoMemberPath: prop(
    'deus:Member',
    'rdf:List',
    'Rule-internal helper: a member IRI split into (package namespace name).',
  ),
  echoMemberString: prop('deus:Member', 'xsd:string', 'Rule-internal helper: a member IRI as a string.'),

  // Derived: Effect (rules/10-effect.n3, 15-types.n3).
  providesService: prop('deus:Symbol', SYMBOL_OR_MEMBER, 'The service key a layer provides.'),
  requiresService: prop(
    'deus:Symbol',
    SYMBOL_OR_MEMBER,
    "A service key a layer's code reads, other than the one it provides.",
  ),
  layerRequires: prop(
    'deus:Symbol',
    SYMBOL_OR_MEMBER,
    "A layer's RIn: each service its inferred Layer type still needs.",
  ),
  resolvesTo: prop(
    SYMBOL_OR_MEMBER,
    'deus:Symbol',
    'A reference IRI as an importer wrote it and the declaration it denotes; only for service keys.',
  ),

  // Derived: packages, names and examples.
  importsTestFile: prop('deus:File', 'deus:File', 'A non-test file importing a test file (rules/50-example.n3).'),
  canonicalName: prop(
    'deus:Symbol',
    'xsd:string',
    'The name an external importer writes (Namespace.identifier), when it differs from deus:name.',
  ),
  publishedBy: prop(
    'deus:File',
    'deus:Package',
    'The file is a package entry, or reachable from one through re-exports.',
  ),
  packagePublic: prop(
    'deus:Symbol',
    'xsd:boolean',
    'Package-public: an exported symbol of a file the package publishes.',
  ),
  usesPackage: prop('deus:Package', 'deus:Package', 'A file of the package imports or re-exports a file of the other.'),
  usesPackageInApi: prop('deus:Package', 'deus:Package', "The same, through a package-public symbol's apiDependsOn."),
  undeclaredDependency: prop('deus:Package', 'deus:Package', 'usesPackage with no declared dependency for it.'),
  violatesLayering: prop('deus:Package', 'deus:Package', 'usesPackage across moon layers the wrong way.'),
  unusedDependency: prop('deus:Package', 'deus:Package', 'declaresDep without usesPackage.'),

  // Derived: specs and gaps (rules/70-specs.n3, 80-gaps.n3).
  specifies: prop(
    'deus:SpecBlock',
    'deus:Symbol',
    'Spec block → the code it defines (op key → Operation, type → EchoType, …).',
  ),
  describes: prop(
    'deus:SpecBlock',
    'deus:Symbol',
    'Everything a block specifies, plus every symbol of its package it mentions.',
  ),
  covers: prop('deus:SpecBlock', 'deus:SpecBlock', "A scenario's tags or a test's covers → the block of that id."),
  includesTest: prop('deus:SpecBlock', 'deus:SpecBlock', "A suite's tests → the test block."),
  automatedBy: prop('deus:SpecBlock', 'deus:File', "A test's automated entry → the spec file that automates it."),
  selectsGlob: prop(
    'deus:SpecBlock',
    'deus:FileGlob',
    'A rule block → each FileGlob of its files, resolved by its scope.',
  ),
  matchesGlob: prop('deus:File', 'deus:FileGlob', 'File → a SelectedGlob whose pattern its path matches.'),
  hasSpec: prop('deus:Package', 'deus:File', 'Package → a .mdl file with a block in that package.'),
  schema: prop(
    'deus:SpecBlock',
    'deus:SpecBlock | deus:Extension',
    'Spec block → what defines its type (an ext block or an Extension).',
  ),
  declaresField: prop('deus:SpecBlock | deus:Extension', 'xsd:string', 'Each field name an ext declares.'),
  requiresField: prop('deus:SpecBlock | deus:Extension', 'xsd:string', 'Each field name an ext declares without ?.'),
  hasKey: prop('deus:SpecBlock', 'xsd:string', 'Each top-level field key, and the type of each nested block.'),
  unknownField: prop('deus:SpecBlock', 'xsd:string', 'A key the block has that no ext in its schema declares.'),
  missingField: prop('deus:SpecBlock', 'xsd:string', 'A field an ext in its schema requires that the block lacks.'),
  violatesSchema: prop(
    'deus:SpecBlock',
    'deus:SpecBlock | deus:Extension',
    'Spec block → the schema it has an unknown or missing field against.',
  ),
  undocumented: prop(
    'deus:Symbol',
    'xsd:boolean',
    'A package-public symbol no spec block describes, in a package that has a spec (none in packages without one).',
  ),
  phantom: prop(
    'deus:SpecBlock',
    'xsd:boolean',
    'A block naming no symbol of its package, or an op block whose key no Operation carries.',
  ),
  unspecified: prop('deus:Symbol', 'xsd:boolean', 'An Operation no spec block specifies.'),
};

/** Local names that look like a misspelling of `term`, closest first. */
export const closest = (term: string, known: Iterable<string>, count = 3): string[] => {
  const lower = term.toLowerCase();
  const scored: { name: string; distance: number }[] = [];
  for (const name of known) {
    const distance = name.toLowerCase() === lower ? 0 : editDistance(lower, name.toLowerCase()) + 1;
    if (distance <= Math.max(2, Math.ceil(term.length / 3))) {
      scored.push({ name, distance });
    }
  }
  // A name differing only in case is the one meant; listing near misses beside it only adds doubt.
  const caseOnly = scored.filter((entry) => entry.distance === 0);
  return (caseOnly.length > 0 ? caseOnly : scored)
    .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name))
    .slice(0, count)
    .map((entry) => entry.name);
};

/** Levenshtein distance, one row at a time. */
const editDistance = (left: string, right: string): number => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let column = 1; column <= right.length; column++) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
};
