# DEUS code ontology

The source of truth for what `code-index` writes. The indexer emits JSON-LD documents shaped by
this document; `Store` upserts them verbatim. `src/Ontology.ts` is the executable mirror of what is
written here — change this file first, then the module.

The index is an **architecture workspace**: it has to let a reader (or an agent) reason about the
shape of the code — packages, public surfaces, what depends on what, what a thing _is_ — without
opening implementations. Two principles follow, and everything below is derived from them:

- **The parser asserts structure; rules assert meaning.** The worker records what a declaration
  extends, what call constructs it, what it references and where — and never knows the word
  "Effect". Per-framework rule files turn those facts into classes (`deus:EffectService`,
  `deus:EchoType`, …), so the vocabulary of a framework lives in a diffable rule file, not in the
  parser.
- **API and implementation are separate facts**, at file level and at symbol level, so an
  "API-only" view is a query over `deus:apiDependsOn`, not a filter someone has to remember.

## Namespaces

| Prefix       | IRI                                     |
| ------------ | --------------------------------------- |
| `deus:`      | `https://dxos.org/vocab/deus#`          |
| `file:`      | `https://dxos.org/deus/file/`           |
| `pkg:`       | `https://dxos.org/deus/package/`        |
| `module:`    | `https://dxos.org/deus/module/`         |
| `graph:`     | `https://dxos.org/deus/graph/`          |
| `type:`      | `https://dxos.org/deus/type/`           |
| `glob:`      | `https://dxos.org/deus/glob/`           |
| `extension:` | `https://dxos.org/deus/extension/`      |
| `lib:`       | `https://dxos.org/deus/lib#`            |
| `rdfs:`      | `http://www.w3.org/2000/01/rdf-schema#` |
| `xsd:`       | `http://www.w3.org/2001/XMLSchema#`     |

Resource IRIs are derived, never invented:

| Thing         | IRI                                                              | Note                                                                                                             |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| File          | `file:` + `<repo-relative path>`                                 | Stable across revisions of the file.                                                                             |
| Symbol        | `<file IRI>` + `#` + `<name>`                                    | Scoped to its file. A private member `#field` is `…#%23field`.                                                   |
| Package       | `pkg:` + `<package.json name>`                                   | The `name` field, e.g. `pkg:@dxos/echo`.                                                                         |
| Member        | `module:` + `<specifier>` + `#` + `<path>`                       | A named export of a module _as imported_: `module:effect/Layer#effect`, `module:@dxos/echo#Type.Obj`.            |
| Spec block    | `<file IRI>` + `#` + `<block type>` + `:` + `<block id or name>` | One block of a `.mdl` document — a fence may hold several, and `req` blocks nest; split on the first `:`.        |
| Spec field    | `<spec block IRI>` + `/` + `<field path>`                        | One field or list item of a block: `…#op:create/input.doc`, `…#test:QA-1/steps.0.name`.                          |
| Extension use | `<file IRI>` + `#@extension/` + `<term>`                         | One row of a document's Extensions table. `@` cannot open a block type, so it never collides.                    |
| Extension     | `extension:` + `<URI>`                                           | Content-addressed: every table naming `org.dxos.mdl.op@1.1` points at one node.                                  |
| Call site     | `<symbol IRI>` + `/call/` + `<callee as written>` + `/` + `<n>`  | One call in a declaration (`…#default/call/Surface.create/0`); at file level `<file IRI>#/call/…`. See CallSite. |
| File glob     | `glob:` + `<glob resolved against the repository root>`          | Content-addressed: every rule naming `packages/**/*.ts` shares one node, so it is matched once.                  |
| File graph    | `graph:file/` + `<path>` + `#` + `<mtime>`                       | Changes on every reindex — see Graphs.                                                                           |
| Derived graph | `graph:derived/` + `<reasoner name>`                             | One per reasoner — see Reasoning.                                                                                |

Every component is written as it is, with one shared escaping rule (`src/internal/iri.ts`) instead
of `encodeURIComponent`: `/`, `@` and `:` stay literal, because they are legal in an IRI path and
the IRI should read like the import or path it names. Only `%`, `#`, `?`, space, `<`, `>`, `"`,
`{`, `}`, `|`, `\`, `^`, `` ` `` and control characters are percent-encoded, plus a path segment that
is exactly `.` or `..` (IRI resolution would collapse it). Fragments use the same rule, so a `#` in a
name never opens a second fragment; a spec block's type additionally escapes `:`, the separator.
Windows `\` separators are normalised to `/` first. File graphs live under `graph:file/` and derived
graphs under `graph:derived/`, so no file path can name a reasoner's graph.

The scheme is versioned (`Ontology.VERSION`). A store recorded under another version is emptied
when it opens and the next pass reindexes everything, rather than mixing two schemes in one graph.

`Member` is the hinge between the agnostic parser and the framework rules. When a file imports
`Layer` from `'effect/Layer'` and writes `Layer.effect(...)`, the parser can name the callee as
`module:effect/Layer#effect` from the import binding alone. For a workspace import (a bare
specifier that resolves inside the repository) **both** addressings are recorded: the resolved
symbol IRI (for analysis) and the member IRI under the specifier as written (for rules, which
should not break when an implementation file moves). Relative imports resolve to symbol IRIs only.

## Graphs

Every file owns one named graph, keyed by path **and** mtime. Nothing about a file is written to
the default graph, so reindexing a file is: write the new `graph:file/<path>#<mtime>` graph, then
drop the previous one. The mtime in the key is what makes the swap safe — a partially written new graph is
never confused with the live one, because the live graph IRI is recorded in SQLite (`files.graph`)
and only advances when the write has completed. See `Store.putDocument` for the commit order.

A `Package` node is asserted from two files' graphs — `package.json` contributes its identity,
`moon.yml` its layer — which is fine in RDF: a node is the union of what every graph says about it,
and either file reindexing alone swaps only its own contribution.

Reasoning writes to `graph:derived/<name>`, one graph per reasoner, never into a file graph. A
reasoner's graph is **replaced wholesale** when it runs: conclusions are exactly what the current
facts entail, so a derived fact cannot outlive the fact that entailed it. Reasoners read only the
file graphs plus the outputs of reasoners ordered before them — never their own previous output,
which would let a derivation keep itself alive.

## Documents — one per file, dispatched by filename

The worker chooses an analyzer by filename; every analyzer emits one JSON-LD document that is the
complete content of that file's graph. Anything not matched yields a bare `File` node.

| Filename                                        | Analyzer   | Emits                                                                                                    |
| ----------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `*.ts *.tsx *.mts *.cts *.js *.jsx *.mjs *.cjs` | typescript | `File` + `Symbol`s, imports, references, snippets, call sites                                            |
| `package.json`                                  | package    | `File` + the `Package` node: name, version, private, entries, declared deps                              |
| `moon.yml`                                      | moon       | `File` + `deus:layer` on the sibling package's `Package` node                                            |
| `*.mdl`                                         | spec       | `File` + frontmatter facts + `ExtensionUse`s + one `SpecBlock` per block, each with its `SpecField` tree |
| `*.md`, `*.json` (other)                        | plain      | `File` only                                                                                              |

The `package` analyzer reads only its own file; the `moon` analyzer additionally reads the sibling
`package.json` for the name (the one cross-file read, because the layer has no other home). The
typescript analyzer walks up from its file to the nearest `package.json` to assert `deus:inPackage`
(cached per directory in the worker).

## Classes

### Asserted by the parser

| Class               | Meaning                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `deus:File`         | One indexed file in the repository.                                     |
| `deus:Package`      | A workspace package (one `package.json`).                               |
| `deus:Symbol`       | A top-level declaration in a file (function, class, variable, type, …). |
| `deus:Member`       | A named export of a module, addressed by specifier — see Namespaces.    |
| `deus:SpecBlock`    | One block of a `.mdl` document (a fence may hold several).              |
| `deus:SpecField`    | One field or list item of a spec block, nested as written.              |
| `deus:ExtensionUse` | One row of a document's Extensions table: a block type and its URI.     |
| `deus:Extension`    | A block-type definition named by URI, shared by every table naming it.  |
| `deus:FileGlob`     | A path glob a spec field names, compiled to a regular expression.       |
| `deus:CallSite`     | One call to a resolvable callee that carries literals — see CallSite.   |

### Derived by rules — on symbols

No `rdfs:subClassOf` is stated anywhere: each class below is concluded on a node the parser already
typed `deus:Symbol`, so `?s a deus:Symbol` keeps matching it, and a query names the derived class
directly.

| Class                      | Recognized by                                                                                                                                                                                                | Rule file                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `deus:EffectService`       | `deus:extends module:effect/Context#Service`                                                                                                                                                                 | `rules/10-effect.n3`                      |
| `deus:EffectLayer`         | `deus:constructedBy` one of `module:effect/Layer#{effect,succeed,scoped,mergeAll,unwrap,provide}`; or a layer built by a repo `deus:EffectLayerFactory` or a library constructor (`rules/15-types.n3`)       | `rules/10-effect.n3`, `rules/15-types.n3` |
| `deus:EffectLayerFactory`  | A function or static method typed to return `Layer<…>`; no `deus:EffectLayer`, so find providers by `deus:providesService`                                                                                   | `rules/15-types.n3`                       |
| `deus:Schema`              | `deus:constructedBy module:effect/Schema#{Struct,TaggedStruct,Class,Union,…}`                                                                                                                                | `rules/10-effect.n3`                      |
| `deus:DomainError`         | `deus:extends module:@dxos/errors#BaseError.extend` or `module:effect/Data#TaggedError`                                                                                                                      | `rules/10-effect.n3`                      |
| `deus:EchoType`            | `deus:extends`/`deus:constructedBy`/`deus:pipedThrough` `module:@dxos/echo#Type.makeObject` (also the `@dxos/echo/Type` subpath, the `@dxos/react-client/echo` re-export, and `Type.ts` inside `@dxos/echo`) | `rules/20-echo.n3`                        |
| `deus:EchoRelation`        | The same, through `Type.makeRelation`                                                                                                                                                                        | `rules/20-echo.n3`                        |
| `deus:Operation`           | `deus:constructedBy` `Operation.make` — addressed as `@dxos/compute/Operation#make`, `@dxos/compute#Operation.make`, or its declaring file                                                                   | `rules/30-compute.n3`                     |
| `deus:OperationHandler`    | `Op.pipe(Operation.withHandler(fn))` / `Operation.lazyHandler`, or data-first `Operation.withHandler(Op, fn)`, whose operation resolves; and `export default handler`                                        | `rules/30-compute.n3`                     |
| `deus:OperationHandlerSet` | `deus:constructedBy OperationHandlerSet.{make,merge,lazy,reactive}`, or a symbol typed `OperationHandlerSet`                                                                                                 | `rules/30-compute.n3`                     |
| `deus:Skill`               | `deus:constructedBy Skill.make`, a symbol typed `Skill.Definition`, or a factory typed `() => Skill.Skill`                                                                                                   | `rules/30-compute.n3`                     |
| `deus:Capability`          | `deus:constructedBy …app-framework…Capability#{make,makeSingleton}` (any addressing, incl. `deus:constructedByPath`)                                                                                         | `rules/41-capabilities.n3`                |
| `deus:Plugin`              | `deus:constructedBy module:@dxos/app-framework/Plugin#define` — the body, with its modules                                                                                                                   | `rules/40-composer.n3`                    |
| `deus:LazyPlugin`          | `deus:constructedBy …Plugin#lazy` — the shim that defers loading the body                                                                                                                                    | `rules/40-composer.n3`                    |
| `deus:PluginMeta`          | `deus:constructedBy …Plugin#{getMetaFromConfig,makeMeta}`                                                                                                                                                    | `rules/40-composer.n3`                    |
| `deus:Rpc`                 | `deus:constructedBy module:effect/rpc/RpcGroup#make`                                                                                                                                                         | `rules/10-effect.n3`                      |
| `deus:PluginModule`        | Built by `Capability.makeModule`/`lazyModule`/`inlineModule`, or by a helper whose signature returns `Capability.Module`, that was built by `Capability.moduleMaker`, or that calls one of those             | `rules/40-composer.n3`                    |

Adding a framework is adding a rule file. The member IRIs above are stable because they follow the
specifier as written in source, not the file the specifier resolves to.

### Derived by rules — on call sites

A framework entity that is one call rather than one declaration — several per module body — is
concluded on the parser's `deus:CallSite` node, so `?c a deus:CallSite` keeps matching it.

| Class          | Recognized by                                                                                                                         | Rule file              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `deus:Surface` | `deus:callee` `module:@dxos/app-framework/ui#Surface.{create,createWeb}` (or the framework's `Surface` barrel with `deus:calleePath`) | `rules/42-surfaces.n3` |

### Derived by rules — spec blocks, all `rdfs:subClassOf deus:SpecBlock`

The parser records a block's type as the string `deus:blockType`; `rules/70-specs.n3` turns the
string into a class, so the vocabulary of `.mdl` dialects lives in a rule file like any framework's.

| Class                | `deus:blockType` | Class              | `deus:blockType` |
| -------------------- | ---------------- | ------------------ | ---------------- |
| `deus:OpSpec`        | `op`             | `deus:QaTest`      | `test`           |
| `deus:TypeSpec`      | `type`           | `deus:QaSuite`     | `suite`          |
| `deus:ComponentSpec` | `component`      | `deus:ReviewRule`  | `rule`           |
| `deus:FeatureSpec`   | `feat`           | `deus:ModuleSpec`  | `module`         |
| `deus:Requirement`   | `req`            | `deus:ServiceSpec` | `service`        |
| `deus:Scenario`      | `scenario`       | `deus:SurfaceSpec` | `surface`        |
| `deus:ExtensionSpec` | `ext`            |                    |                  |

Any other block type stays a plain `deus:SpecBlock`.

## Properties

### File

| Property                    | Range          | Meaning                                                                                        |
| --------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `deus:path`                 | `xsd:string`   | Repo-relative path, POSIX separators.                                                          |
| `deus:language`             | `xsd:string`   | `typescript`, `javascript`, `json`, `yaml`, `markdown`, `mdl`, `other`.                        |
| `deus:size`                 | `xsd:integer`  | Bytes.                                                                                         |
| `deus:mtime`                | `xsd:integer`  | Modification time, epoch milliseconds — the incremental-indexing key.                          |
| `deus:hash`                 | `xsd:string`   | SHA-256 of the contents, hex.                                                                  |
| `deus:inPackage`            | `deus:Package` | Nearest enclosing `package.json`.                                                              |
| `deus:testFile`             | `xsd:boolean`  | `true` on a `*.test.*` / `*.spec.*` script; absent otherwise, so rules join on it.             |
| `deus:imports`              | `deus:File`    | Resolved import used at runtime (value position).                                              |
| `deus:importsType`          | `deus:File`    | Resolved import used **only** in type positions, or written `import type` — erased at runtime. |
| `deus:importsModule`        | `xsd:string`   | Unresolved specifier, verbatim (bare package, virtual module, missing file).                   |
| `deus:reexports`            | `deus:File`    | `export * from` / `export { x } from` — the edge public-API reachability follows.              |
| `deus:describesPackage`     | `deus:Package` | On `package.json` and `moon.yml`: the `Package` node the file states facts about.              |
| `deus:declares`             | `deus:Symbol`  | A top-level declaration the file introduces.                                                   |
| `deus:unresolvedReferences` | `xsd:integer`  | Identifier references the resolver could not bind (see Resolution). A quality gauge.           |
| `deus:parseError`           | `xsd:string`   | One message per parse diagnostic; present only on failure.                                     |

A `.mdl` file additionally carries its frontmatter and its Extensions table:

| Property             | Range               | Meaning                                                                                                                              |
| -------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `deus:specId`        | `xsd:string`        | Frontmatter `id` — the document URI other documents `extends`.                                                                       |
| `deus:specName`      | `xsd:string`        | Frontmatter `name`.                                                                                                                  |
| `deus:specVersion`   | `xsd:string`        | Frontmatter `version`.                                                                                                               |
| `deus:specExtends`   | `xsd:string`        | Each frontmatter `extends` URI.                                                                                                      |
| `deus:frontmatter`   | `xsd:string`        | Every other frontmatter key, as `key=value` (one fact per list element).                                                             |
| `deus:usesExtension` | `deus:ExtensionUse` | A row of the Extensions table: `deus:term` (the block type) and `deus:extension` → the URI's `Extension` node (`deus:extensionUri`). |
| `deus:declaresBlock` | `deus:SpecBlock`    | Every block of the document, nested ones included (`deus:partOf` keeps the nesting).                                                 |

A specifier is recorded in exactly one of `imports` / `importsType` / `importsModule`.

### Package

| Property           | Range          | Meaning                                                                                               |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| `deus:name`        | `xsd:string`   | `package.json` `name`.                                                                                |
| `deus:version`     | `xsd:string`   |                                                                                                       |
| `deus:private`     | `xsd:boolean`  |                                                                                                       |
| `deus:layer`       | `xsd:string`   | moon `layer:` — `tool`, `library`, `application`, … (from `moon.yml`).                                |
| `deus:entry`       | `deus:File`    | One per export-map subpath: the `source` condition if present, else `types`. The public entry points. |
| `deus:declaresDep` | `deus:Package` | A workspace dependency (`dependencies`); `deus:declaresDevDep` / `deus:declaresPeerDep` likewise.     |
| `deus:packagePath` | `xsd:string`   | Directory of the `package.json`, repo-relative.                                                       |

### Symbol

| Property                 | Range                       | Meaning                                                                                                                                                                                                      |
| ------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deus:name`              | `xsd:string`                | Declared name; `default` for an anonymous default export.                                                                                                                                                    |
| `deus:kind`              | `xsd:string`                | `function`, `class`, `variable`, `type`, `interface`, `enum`, `namespace`, `unknown`, `reexport` on an alias symbol and `top-level` (both below). A static method `Class.key` is a `function`.               |
| `deus:exported`          | `xsd:boolean`               | **Module-public**: the declaration leaves its module.                                                                                                                                                        |
| `deus:line`              | `xsd:integer`               | 1-based line of the declaration.                                                                                                                                                                             |
| `deus:extends`           | `deus:Symbol`/`deus:Member` | Heritage clause target. When the clause is a call (`extends Context.Service<…>()('id')`, `extends BaseError.extend(...)`), the callee.                                                                       |
| `deus:constructedBy`     | `deus:Symbol`/`deus:Member` | The callee when the initializer is a call. `.pipe(...)` chains are unwrapped: the innermost call's callee is `constructedBy`, each piped call's callee is `deus:pipedThrough`.                               |
| `deus:pipedThrough`      | `deus:Symbol`/`deus:Member` | Callees applied via `.pipe(...)` to the constructed value (e.g. `Type.Obj`, `Operation.withHandler`).                                                                                                        |
| `deus:derivedFrom`       | `deus:Symbol`/`deus:Member` | The base of a `.pipe(...)` chain when it is a reference rather than a call (`SentenceNormalization.pipe(...)` → `SentenceNormalization`). A handler is _derived from_ its operation.                         |
| `deus:argument`          | `deus:Symbol`/`deus:Member` | The first argument of the constructing call, when it is an identifier reference (`Layer.effect(Store, …)` → `Store`).                                                                                        |
| `deus:constructedByPath` | `xsd:string`                | The dotted path the `deus:constructedBy` symbol IRI did not consume: `Capability$.make` through `import { Capability as Capability$ } from '../core'` lands on the namespace `Capability`, leaving `make`.   |
| `deus:passesLiteral`     | `deus:Argument`             | A string literal (≤ 256 chars) this declaration passes into a call outside any function body — see Argument. `DXN.make('a', '0.1.0')` → slots `"0"`, `"1"`; two keys deep: `"0.plugin.key"`.                 |
| `deus:passes`            | `deus:Argument`             | A reference this declaration passes into a call anywhere in its span — see Argument.                                                                                                                         |
| `deus:apiDependsOn`      | `deus:Symbol`/`deus:Member` | A reference from a **type position** of this declaration — see API vs implementation.                                                                                                                        |
| `deus:implDependsOn`     | `deus:Symbol`/`deus:Member` | A reference from a **value position** (body, initializer).                                                                                                                                                   |
| `deus:aliasOf`           | `deus:Symbol`               | On an alias symbol (`deus:kind "reexport"`) for `export { x } from './y'` or `export { default as X } from './y'`: the declaration it stands for. `rules/90-aliases.n3` copies the origin's classes onto it. |
| `deus:namespaceOf`       | `deus:File`                 | On a `namespace` symbol from `export * as N from './y'`: the module it publishes whole. The name is a fact of the barrel, the identifiers it qualifies are facts of `./y`.                                   |
| `deus:loads`             | `deus:File`                 | A file the declaration imports dynamically (`() => import('./y')`): what a lazy shim or module defers.                                                                                                       |
| `deus:snippet`           | `xsd:string`                | The definition with implementation abbreviated — valid TypeScript, see Snippets.                                                                                                                             |
| `deus:doc`               | `xsd:string`                | The JSDoc summary (first paragraph), when present.                                                                                                                                                           |
| `deus:deprecated`        | `xsd:boolean`               | A `@deprecated` tag is present.                                                                                                                                                                              |
| `deus:hasType`           | `deus:Type`                 | The type of the value a `variable` or `function` symbol declares, inferred per file — see Types. Absent when unknown.                                                                                        |

### Argument

One reference passed into a call, so a rule can tell `provides: [X]` from `requires: [X]` and the
first argument of `contribute(X, …)` from a mention of `X`. Recorded for every call in the declaration
whose callee and argument both resolve; only shallow slots are followed — a positional argument, an
element of an array argument, a property (or a property's array element) of an object-literal
argument — and a local `const` bound to an object or array literal reads as if written inline.
Identity is `(callee as written, slot, reference as written)` within the declaration.

| Property             | Range                       | Meaning                                                                                                                                 |
| -------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `deus:callee`        | `deus:Symbol`/`deus:Member` | The called function, addressed as `deus:constructedBy` addresses one.                                                                   |
| `deus:calleePath`    | `xsd:string`                | Path left over after the callee's symbol IRI, as for `deus:constructedByPath`.                                                          |
| `deus:slot`          | `xsd:string`                | `"0"`, `"1"`, … or `"<index>.<property>"`: `lazyModule(name, { provides: [X] })` → `"1.provides"`.                                      |
| `deus:reference`     | `deus:Symbol`/`deus:Member` | What the argument references.                                                                                                           |
| `deus:literal`       | `xsd:string`                | On a `deus:passesLiteral` argument, in place of `deus:reference`: the string as written.                                                |
| `deus:referencePath` | `xsd:string`                | Path left over after the reference's symbol IRI: `MapCapabilities.State` via `import { MapCapabilities } from '#types'` leaves `State`. |

### CallSite

One call whose head callee resolves (an import binding, a top-level declaration, or a namespace
member), with the scalar literals its arguments spell out — the framework-agnostic record rules read
identity from (`Surface.create({ id })`, `Operation.make({ meta: { key } })`). Unlike
`deus:passesLiteral` it is recorded inside function bodies too, where every `Surface.create` sits.
Nodes go in the document's `@included`, like type terms. A site is emitted when it carries a literal
or an object-literal argument with properties, or when an emitted site is its argument through
`deus:argOf`; any other call would only repeat `deus:implDependsOn`. Globals, method calls on local
values and `x.pipe(…)` heads are not sites; a curried chain `f(a)(b)` is one site, `f`.

| Property          | Range                       | Meaning                                                                                                                                                                                                                                        |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deus:callee`     | `deus:Symbol`/`deus:Member` | The head callee, addressed as `deus:constructedBy` addresses one.                                                                                                                                                                              |
| `deus:calleePath` | `xsd:string`                | Path left over after the callee's symbol IRI, as on Argument.                                                                                                                                                                                  |
| `deus:enclosedBy` | `deus:Symbol`/`deus:File`   | The innermost declaration whose span holds the call, or the File for a top-level statement (`describe(…)`).                                                                                                                                    |
| `deus:line`       | `xsd:integer`               | 1-based line of the call.                                                                                                                                                                                                                      |
| `deus:argOf`      | `deus:CallSite`             | The call this one is an argument of, through array elements, object properties, spreads and `as`/`!`/`satisfies`/parentheses only — never across a function boundary or a member access.                                                       |
| `deus:argKey`     | `xsd:string`                | Where it sits in that call: the positional index (`"1"`), or the object path without the index (`"meta.key"`). A curried chain numbers its arguments flat across its argument lists.                                                           |
| `deus:literal`    | `xsd:string`                | `key=value`: `<index>=v` for a positional scalar (`describe('Store')` → `0=Store`), `<path>=v` under object keys (`meta.key=org.dxos.operation.markdown.create`), one fact per scalar array element. Numbers and booleans are written as text. |

A scalar is a string, number or boolean literal (`-1` included), a top-level `const X = '…'` of the
same file, or a call of a resolvable callee with exactly one string argument — so
`meta: { key: DXN.make('x') }` reads `meta.key=x`, and `{ kind: Schema.Literal('a') }` reads `kind=a`.
Bounds: the first 8 positional arguments; object paths at most 3 keys deep, keys matching
`^[A-Za-z_$][\w$-]*$`; at most 16 array elements; values at most 256 characters with no newline; at
most 32 literals per site; at most 2000 sites per file.

Identity is `(enclosing declaration, callee as written, n)`, where `n` counts the resolvable calls
with that callee text in that declaration, in source order, before any site is filtered out — so a
site keeps its IRI when code moves or lines shift, and only a same-callee call inserted before it in
the same declaration renumbers it.

`deus:callee`, `deus:calleePath` and `deus:literal` are shared with Argument nodes, and `deus:callee`
with `returnOf` type terms: a rule about calls joins `rdf:type deus:CallSite` (or `deus:enclosedBy`).

On this repository (16,940 files) that is 84,453 sites and 492,336 quads — 18% of a 2.78M-quad store,
inside the 500k budget the bounds above are set for. If it grows past that, drop sites that are only
an `argOf` ancestor first, then their `deus:line`, then `*.stories.*` files.

### SpecBlock

A fence holds one or more blocks: a line at the fence's own indentation opens the next one unless it
reads as a `key: value` field. Inside a block, a line `<type> <Id>: …` at the body's indentation opens
a nested block (`req F-1.1: …` inside a `feat`), which is a block of its own. The id must start with a
capital or a digit, so prose such as `relies on: …` stays prose.

| Property         | Range            | Meaning                                                                                        |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `deus:blockType` | `xsd:string`     | The block's first token: `module`, `type`, `feat`, `req`, `test`, `op`, `rule`, `ext`, …       |
| `deus:blockId`   | `xsd:string`     | The id when present (`F-1`, `QA-3`, `smoke`).                                                  |
| `deus:name`      | `xsd:string`     | The name for `module`/`type`/`service`/`op`/`ext`/… blocks, or the title after the colon.      |
| `deus:line`      | `xsd:integer`    | 1-based line of the header.                                                                    |
| `deus:body`      | `xsd:string`     | The source below the header, dedented, nested blocks included.                                 |
| `deus:prose`     | `xsd:string`     | Body lines that are neither fields nor nested blocks — a `rule`'s or `feat`'s description.     |
| `deus:hasField`  | `deus:SpecField` | Each top-level field.                                                                          |
| `deus:partOf`    | `deus:SpecBlock` | The block a nested block sits in (`req F-1.1` → `feat F-1`).                                   |
| `deus:mentions`  | `xsd:string`     | Every backticked identifier in the block's own lines, verbatim — the raw material for linking. |
| `deus:inPackage` | `deus:Package`   | Nearest enclosing `package.json`.                                                              |

### SpecField

The body is a tree: `key: value` lines, `- item` lists (an item may itself be a map, as a `test`'s
`steps` are), `{ a: T, b?: U }` flow maps and `[a, b]` flow lists, `|` block scalars, and values
wrapped onto further lines. Each entry is one node, so nesting is kept: `op` `input: { doc:
Ref<Document> }` is the field `input` with the child `input.doc`. Trailing ` # comments` are dropped.
At a block's top level a capitalised `Source: …` line is prose, not a field.

| Property           | Range            | Meaning                                                                                           |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------- |
| `deus:key`         | `xsd:string`     | The key, `?` removed. Absent on a list item.                                                      |
| `deus:index`       | `xsd:integer`    | A list item's position. Absent on a keyed field.                                                  |
| `deus:fieldPath`   | `xsd:string`     | Keys and indices from the block down, dot-joined: `input.doc`, `steps.0.name`, `fields.severity`. |
| `deus:value`       | `xsd:string`     | The scalar text. Absent when the entry only has children.                                         |
| `deus:optional`    | `xsd:boolean`    | Written `key?:` — how an `ext` marks a declared field optional.                                   |
| `deus:line`        | `xsd:integer`    | 1-based line.                                                                                     |
| `deus:hasField`    | `deus:SpecField` | Each child entry or list item.                                                                    |
| `deus:refScope`    | `xsd:string`     | For a value written `<scope>:<target>[#<fragment>]` (`markdown:QA-1`, `op:create`): the scope.    |
| `deus:refTarget`   | `xsd:string`     | The target of such a reference.                                                                   |
| `deus:refFragment` | `xsd:string`     | Its fragment, when present (`composer-e2e:basic.spec.ts#Basic tests › create document`).          |
| `deus:repoGlob`    | `deus:FileGlob`  | On a value under a `files` key: the glob resolved against the repository root.                    |
| `deus:dirGlob`     | `deus:FileGlob`  | The same glob resolved against the document's directory. Which applies is a rule's decision.      |

A `FileGlob` carries `deus:glob` (the resolved glob) and `deus:pathPattern`, an anchored regular
expression over `deus:path` (`**/` spans any number of directories, `*` and `?` stay within one,
`{a,b}` is an alternative). Compiling a glob is the one computation the parser does for a spec: both
rule engines can match a regular expression but neither can build one from a glob, and a glob is
syntax, not meaning — which files a `rule` block reviews is still concluded by a rule, from its
`scope`. `files` is the only key the parser reads this way.

A reference is split by the parser for the same reason: N3 can join on a string but not cut one, and
`<scope>:<target>#<fragment>` is the reference syntax of the language (`core.mdl`), not of one block
type.

### Derived — written by reasoners, never by the parser

| Property / class             | Meaning                                                                                                                                                                                                                                                                                                                                                                     | Reasoner                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `deus:implementsOperation`   | An `OperationHandler` and the `Operation` it is built from (`derivedFrom` or the data-first `argument`), resolved through barrels, `export *` and namespaces to the declaration.                                                                                                                                                                                            | `rules/30-compute.n3`      |
| `deus:bundlesHandler`        | An `OperationHandlerSet` and a handler it names, or — for a lazy set — the default export of a module it `deus:loads` whose operation the set pairs with that loader.                                                                                                                                                                                                       | `rules/30-compute.n3`      |
| `deus:exposesOperation`      | A `Skill` and each operation passed to `Skill.toolDefinitions({ operations })` (slot `0.operations`) in it, its factory, or a same-file list — never one it binds as a hook or reads elsewhere.                                                                                                                                                                             | `rules/30-compute.n3`      |
| `deus:handlesOperation`      | An `OperationHandlerSet` and each operation it serves: its bundled handlers', its merged sets', every entry of `OperationHandlerSet.lazy([...])`, and the first entry of `make(...)`.                                                                                                                                                                                       | `rules/30-compute.n3`      |
| `deus:referencesOperation`   | A symbol whose implementation names an operation (`deus:implDependsOn`), directly, through barrels, or as `NS.Op` — `Operation.invoke` sites included.                                                                                                                                                                                                                      | `rules/30-compute.n3`      |
| `deus:denotes`               | A reference IRI (a re-export, or a star barrel's name for it) and the `Operation` declaration it stands for — the join the relations above resolve through.                                                                                                                                                                                                                 | `rules/30-compute.n3`      |
| `deus:exportsOperation`      | A file exporting an operation by its bare name: declaring it, or through a bare `export *` (not `export * as N`).                                                                                                                                                                                                                                                           | `rules/30-compute.n3`      |
| `deus:operationNamespace`    | A namespace symbol (`export * as N`, or a re-export of one) and the module it publishes, when that module declares operations.                                                                                                                                                                                                                                              | `rules/30-compute.n3`      |
| `deus:operationKey`          | An `Operation`'s `meta.key`: the `meta.key=…` literal of the `Operation.make` call site its definition encloses — a string, or `DXN.make('…')` read as its one string.                                                                                                                                                                                                      | `rules/30-compute.n3`      |
| `deus:operationInput`        | The named schema at `input` (a repo symbol, else the external member; through `NS.X`, the member). None for an inline `Schema.Struct({…})`.                                                                                                                                                                                                                                 | `rules/30-compute.n3`      |
| `deus:operationOutput`       | Likewise for `output`.                                                                                                                                                                                                                                                                                                                                                      | `rules/30-compute.n3`      |
| `deus:operationRequires`     | Each service named in `services: [...]`, resolved likewise.                                                                                                                                                                                                                                                                                                                 | `rules/30-compute.n3`      |
| `deus:contributesCapability` | A declaration and each `Capability` it fills: a body's `Capability.contribute(X, …)`, a module's `provides: [X]`, or the capability of the helper (maker) it is built by plus the `provides` its options add. Never a capability it only reads (`requires`, `Capability.get`).                                                                                              | `rules/41-capabilities.n3` |
| `deus:surfaceId`             | A `Surface` call site's `id=…` literal (a string, or a same-file string constant).                                                                                                                                                                                                                                                                                          | `rules/42-surfaces.n3`     |
| `deus:providedBy`            | A `Surface` and the `Plugin` that adds the module it is created in: the enclosing module, or the lazy module that `deus:loads` its file; else, outside stories and tests, the one plugin its package defines.                                                                                                                                                               | `rules/42-surfaces.n3`     |
| `deus:buildsModuleFor`       | A helper whose modules contribute a `Capability`: `Capability.moduleMaker(name, X)`, or a function building a module that provides `X` or calling such a maker (`AppCapability.surface`).                                                                                                                                                                                   | `rules/41-capabilities.n3` |
| `deus:addsModule`            | A `Plugin` referencing a `PluginModule` in its implementation (`Plugin.addModule(X)`), through a barrel alias or one `export *` hop.                                                                                                                                                                                                                                        | `rules/40-composer.n3`     |
| `deus:pluginMeta`            | A `Plugin`/`LazyPlugin` and the `PluginMeta` it is defined with (argument 0, one re-export hop).                                                                                                                                                                                                                                                                            | `rules/40-composer.n3`     |
| `deus:pluginId`              | The plugin key string, on a `PluginMeta` and its plugins: `Config2.make({ plugin: { key } })` or `makeMeta({ key: DXN.make(…) })`.                                                                                                                                                                                                                                          | `rules/40-composer.n3`     |
| `deus:loadsPlugin`           | A `LazyPlugin` and the `Plugin` declared in the file it `deus:loads`.                                                                                                                                                                                                                                                                                                       | `rules/40-composer.n3`     |
| `deus:definesPlugin`         | A `Package` and each `Plugin` declared in one of its files.                                                                                                                                                                                                                                                                                                                 | `rules/40-composer.n3`     |
| `deus:echoTypename`          | An ECHO type's typename: slot 0 of the one literal `DXN.make(…)` its declaration passes (none when there are several, or the DXN is not a literal).                                                                                                                                                                                                                         | `rules/20-echo.n3`         |
| `deus:echoVersion`           | Its version: slot 1 of that `DXN.make(…)`, under the same condition.                                                                                                                                                                                                                                                                                                        | `rules/20-echo.n3`         |
| `deus:echoSchema`            | The named schema an ECHO type is built from: `Type.makeObject(dxn)(PersonSchema)` or `PersonSchema.pipe(Type.makeObject(dxn))` — a `deus:Schema` or a refinement of one (`deus:derivedFrom`).                                                                                                                                                                               | `rules/20-echo.n3`         |
| `deus:echoReferences`        | An ECHO type and each ECHO type a `Ref.Ref(X)` field names — in its own span or in the schema it is built from — resolved through barrels and namespaces (one unambiguous match only).                                                                                                                                                                                      | `rules/20-echo.n3`         |
| `deus:relationSource`        | An `EchoRelation`'s `source` endpoint (`Type.makeRelation(dxn)({ source: A, target: B })`), when it is an ECHO type (`Obj.Unknown` is not).                                                                                                                                                                                                                                 | `rules/20-echo.n3`         |
| `deus:relationTarget`        | Its `target` endpoint, likewise.                                                                                                                                                                                                                                                                                                                                            | `rules/20-echo.n3`         |
| `deus:providesService`       | The key a providing constructor (`Layer.effect/succeed/sync/scoped/mock`) is built for, named by its declaration (or by its member when it resolves to none); each service in the `ROut` of its inferred type; and what the layer it is piped from or merges first provides (`rules/15-types.n3`). On a `deus:EffectLayerFactory`, what the layer it returns provides.      | `rules/10-effect.n3`       |
| `deus:requiresService`       | A layer built by `Layer.effect/scoped/effectDiscard` whose initializer refers to a service key other than the one it provides — what its code reads, not what remains after `Layer.provide` (that is `layerRequires`). Skipped when it calls `Effect.serviceOption`.                                                                                                        | `rules/10-effect.n3`       |
| `deus:layerRequires`         | A layer's `RIn`: each service its inferred `Layer<ROut, E, RIn>` type still needs. Exact where the type is known. On a `deus:EffectLayerFactory`, the `RIn` of the layer it returns.                                                                                                                                                                                        | `rules/15-types.n3`        |
| `deus:resolvesTo`            | A reference IRI as an importer wrote it (`file:<barrel>#X` through `export *`, aliases and namespaces; `module:<specifier>#X.y` via `deus:moduleFile`) and the declaration it denotes. Every reference and alias, where they differ. An `#imports` module naming several files is skipped; `10-effect` restates service keys through the `file:` twin.                      | `resolve-refs` pass        |
| `deus:usesDeprecated`        | A symbol (not a re-export) and a `deus:deprecated` declaration it depends on, directly or through `deus:resolvesTo`. Class and interface members are not symbols, so their deprecations are unseen.                                                                                                                                                                         | `rules/67-usage.n3`        |
| `deus:importsTestFile`       | A non-test file importing a test file.                                                                                                                                                                                                                                                                                                                                      | `rules/50-example.n3`      |
| `deus:canonicalName`         | **The name an external importer writes**, stated only when it differs from `deus:name`: `<Namespace>.<identifier>` when the declaring module is published whole via `export * as N`. Elsewhere the canonical name is `deus:name`; a query reads `COALESCE(?canonical, ?name)`.                                                                                              | `rules/60-canonical.n3`    |
| `deus:publishedBy`           | File → `Package`: the file is a `deus:entry` of the package, or reachable from one through `deus:reexports` or a namespace's `deus:namespaceOf`.                                                                                                                                                                                                                            | `rules/65-packages.n3`     |
| `deus:packagePublic`         | **Package-public**: an exported symbol of a file the package publishes. Distinct from `deus:exported`, which is module-public. Over-approximates `export { x } from`, which publishes only `x`.                                                                                                                                                                             | `rules/65-packages.n3`     |
| `deus:usesPackage`           | Package `p` has a file importing (value or type) or re-exporting a file of package `q`, `p ≠ q`, `q` not the workspace root.                                                                                                                                                                                                                                                | `rules/65-packages.n3`     |
| `deus:usesPackageInApi`      | Same, but through `deus:apiDependsOn` of a package-public symbol — the deps that must be public/peer.                                                                                                                                                                                                                                                                       | `rules/65-packages.n3`     |
| `deus:undeclaredDependency`  | `usesPackage` with no `declaresDep`, `declaresDevDep` or `declaresPeerDep` for it.                                                                                                                                                                                                                                                                                          | `rules/65-packages.n3`     |
| `deus:violatesLayering`      | `usesPackage` across moon layers the wrong way: a `library` using an `application`, `automation` or `tool` package, or anything using an `application`.                                                                                                                                                                                                                     | `rules/65-packages.n3`     |
| spec classes                 | `deus:OpSpec`, `deus:Requirement`, … — see Classes.                                                                                                                                                                                                                                                                                                                         | `rules/70-specs.n3`        |
| `deus:specifies`             | Spec block → the code it defines: an `op` block's `key` → the `Operation` with that `operationKey` (or, keyless, the `Operation` of its name); a `type` → an `EchoType`/`EchoRelation`/`Schema`/type alias/interface/enum; a `service` → an `EffectService`/`Capability`; a `component`/`surface`/`module` → any exported symbol — each by name within the block's package. | `rules/70-specs.n3`        |
| `deus:describes`             | Spec block → symbol: everything it `specifies`, plus every symbol of its package whose canonical name (`deus:canonicalName`, else `deus:name`) the block `deus:mentions`.                                                                                                                                                                                                   | `rules/70-specs.n3`        |
| `deus:covers`                | A `scenario`'s `tags` or a `test`'s `covers` → the block of that id in the same document (`feat`, `req`, `scenario`).                                                                                                                                                                                                                                                       | `rules/70-specs.n3`        |
| `deus:includesTest`          | A `suite`'s `tests` → the `test` block: `QA-1` in the same document, `markdown:QA-1` in the document whose `deus:specId` ends `.markdown` (or contains `.app.` for `app:`).                                                                                                                                                                                                 | `rules/70-specs.n3`        |
| `deus:automatedBy`           | A `test`'s `automated` entry `composer-e2e:basic.spec.ts#…` → the file `…/basic.spec.ts` of the package at `…/composer-e2e`. The test name stays on the field (`deus:refFragment`): the index has no facts for individual test cases.                                                                                                                                       | `rules/70-specs.n3`        |
| `deus:selectsGlob`           | A `rule` block → each `FileGlob` of its `files`, resolved by its `scope`: `repo` → `deus:repoGlob`, otherwise `deus:dirGlob`.                                                                                                                                                                                                                                               | `rules/70-specs.n3`        |
| `deus:SelectedGlob`          | A `FileGlob` some `rule` block selects — the only globs worth matching against every path.                                                                                                                                                                                                                                                                                  | `rules/70-specs.n3`        |
| `deus:matchesGlob`           | File → `SelectedGlob` whose `deus:pathPattern` its `deus:path` matches.                                                                                                                                                                                                                                                                                                     | `rules/70-specs.n3`        |
| `deus:hasSpec`               | Package → a `.mdl` file with a block in that package.                                                                                                                                                                                                                                                                                                                       | `rules/70-specs.n3`        |
| `deus:schema`                | Spec block → what defines its type: an `ext` block in the same document or in one the frontmatter `extends`, or the `Extension` the document's Extensions table names for the type.                                                                                                                                                                                         | `rules/70-specs.n3`        |
| `deus:declaresField`         | `ext` block → each field name of its `fields`/`adds-fields`, plus those of the `ext` it `extends` in the same document. `Extension` → the union over every `ext` block whose `uri` it is.                                                                                                                                                                                   | `rules/70-specs.n3`        |
| `deus:requiresField`         | `ext` block → each field name it declares without `?`; `Extension` → each one any `ext` of its URI requires.                                                                                                                                                                                                                                                                | `rules/70-specs.n3`        |
| `deus:hasKey`                | Spec block → each top-level field key, and the type of each nested block (`feat` → `req`).                                                                                                                                                                                                                                                                                  | `rules/70-specs.n3`        |
| `deus:unknownField`          | A key the block has that no `ext` in its `deus:schema` declares.                                                                                                                                                                                                                                                                                                            | `rules/80-gaps.n3`         |
| `deus:missingField`          | A field an `ext` in its `deus:schema` requires that the block lacks.                                                                                                                                                                                                                                                                                                        | `rules/80-gaps.n3`         |
| `deus:violatesSchema`        | Spec block → the schema (`ext` block or `Extension`) it has an unknown or missing field against.                                                                                                                                                                                                                                                                            | `rules/80-gaps.n3`         |
| `deus:undocumented`          | `true` on a package-public symbol no spec block describes, in a package that has a spec. Aliases and namespace barrels are skipped: their origin is what is reported.                                                                                                                                                                                                       | `rules/80-gaps.n3`         |
| `deus:phantom`               | `true` on a `type`/`service`/`component`/`surface`/`module` block naming no symbol of its package, and on an `op` block whose `key` no `Operation` carries.                                                                                                                                                                                                                 | `rules/80-gaps.n3`         |
| `deus:unspecified`           | `true` on an `Operation` no spec block specifies.                                                                                                                                                                                                                                                                                                                           | `rules/80-gaps.n3`         |
| `deus:unusedDependency`      | `declaresDep` without `usesPackage`. Deps used only from config, CSS or scripts the index does not parse show up here too.                                                                                                                                                                                                                                                  | `rules/80-gaps.n3`         |
| classes in the table above   | `deus:EffectService`, `deus:EchoType`, …                                                                                                                                                                                                                                                                                                                                    | per framework              |

### Rule-internal vocabulary

Terms the rule files use to talk to themselves. They are facts stated by a rule file or helpers
concluded backward (`<=`) inside it, not part of the vocabulary a query should rely on; most never
reach a derived graph, and `vocabulary` lists them with count 0 when they do not.

| Term                                                                  | Meaning                                                                                                          | Rule file             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------- |
| `deus:computeRole`                                                    | Which compute API a callee IRI is (`"operation"`, `"handler"`, `"handlerSet"`, …), stated per addressing.        | `rules/30-compute.n3` |
| `deus:EchoDxnFactory`, `deus:EchoRefFactory`                          | The `DXN.make` and `Ref.Ref` members (every addressing) the ECHO rules key on.                                   | `rules/20-echo.n3`    |
| `deus:echoFactoryOf`, `deus:echoClass`                                | A `Type.makeObject`/`makeRelation` IRI and the class it builds; `true` on `EchoType` and `EchoRelation`.         | `rules/20-echo.n3`    |
| `deus:echoDxnOf`, `deus:echoDxnVersionOf`                             | A typename or version literal and the declaration passing it to `DXN.make` — what `echoTypename` is chosen from. | `rules/20-echo.n3`    |
| `deus:echoDenotes`                                                    | An argument and the declaration its reference resolves to, through barrels and namespaces.                       | `rules/20-echo.n3`    |
| `deus:echoIsSchema`, `deus:echoRefines`                               | A `Schema` or a refinement of one; a schema and each schema it derives from (reflexive).                         | `rules/20-echo.n3`    |
| `deus:echoBarrelOf`                                                   | A barrel and a file it imports.                                                                                  | `rules/20-echo.n3`    |
| `deus:echoMemberName`, `deus:echoMemberPath`, `deus:echoMemberString` | A member IRI split into `(package name)` / `(package namespace name)`, and as a string.                          | `rules/20-echo.n3`    |

`deus:dependsOn` appears only in a commented-out example in `rules/50-example.n3`; nothing concludes
it.

A `rule` block's reviewed files are deliberately **not** materialized as `deus:reviews`: on this
repository that is 841,129 pairs, because 98 rules share a few repo-wide globs. They are the path
`deus:selectsGlob/^deus:matchesGlob`, which stores each distinct glob's matches once (~40k).

Negation needs a stratum: a rule file may not negate a predicate it concludes itself (both engines
evaluate a file to a fixpoint). That is why the gaps live in `80-gaps.n3`, after the files that
conclude `describes`, `specifies`, `usesPackage` and `schema`.

Reachability over `deus:imports` is deliberately **absent**. A SPARQL property path walks it lazily
(`deus:imports+`, ~0.2s over a 15k-file index) where the equivalent closure rule cost 147s per
pass and 123,692 stored quads for identical answers. Paths (`+`, `*`, `^`, `|`) cover reachability,
inverses and alternatives; do not materialize what a query already expresses.

## Types

The typescript analyzer names the type of each `variable` and `function` symbol it can, from the one
file it parses — no type checker, no cross-file reads. `design/TYPES.md` is the source of truth for the
term language, the inference rules, and the bail-out policy; this section is the vocabulary.

A type is a node of class `deus:Type` whose IRI is `type:` + a hash of its canonical text, so a type
used twice is one node and the same type in two files is the same IRI. Every node carries:

| Property           | Range         | Meaning                                                                                                   |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------- |
| `deus:typeKind`    | `xsd:string`  | `primitive`, `literal`, `ref`, `typeof`, `union`, `intersection`, `object`, `tuple`, `function`, `param`. |
| `deus:typeText`    | `xsd:string`  | The canonical text: equal types, equal text. Symbols appear as `<iri>`.                                   |
| `deus:typePartial` | `xsd:boolean` | Some position is unknown; the structure facts below are then incomplete.                                  |

and, by kind:

| Property                               | On                      | Meaning                                                                                                                |
| -------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `deus:typeHead`                        | `ref`, `typeof`         | The named type (`ref`) or value (`typeof`): a symbol, member, or `lib:` IRI — the same IRIs `deus:constructedBy` uses. |
| `deus:typeArg0` … `typeArg7`           | `ref`                   | Type arguments, positional; defaults are filled in where `tsc` would report them.                                      |
| `deus:typeMember`                      | `union`, `intersection` | Each member.                                                                                                           |
| `deus:typeProperty`                    | `object`                | A `deus:TypeProperty` node: `deus:name`, `deus:hasType`, and `deus:optional` / `deus:readonly` when true.              |
| `deus:typeElement0` …                  | `tuple`                 | Element types, positional.                                                                                             |
| `deus:typeParam0` …, `deus:returnType` | `function`              | Parameter types, positional, and the return type.                                                                      |
| `deus:literalValue`                    | `literal`               | The literal as written in the canonical text (`"a"`, `1`, `true`).                                                     |

An `unresolved` term is a node like any other (`typeKind "unresolved"`, `deus:unresolvedReason`).
Deferred terms are `typeof` (`typeHead` = the value) and `returnOf` (`deus:callee`, `typeArg<i>` = the
argument types), with `deus:pending` for owed operations. A symbol also carries `deus:typeTerm`, its
term as JSON, and the `bind-types` pass asserts the cross-file-bound term as a further
`deus:hasType` in its pass graph. A `deus:Module` node (`deus:moduleFile`) records where a bare
specifier resolves inside the repository. A term over 64 nodes is not emitted. Rules match a type by its
head: `?layer deus:hasType ?t. ?t deus:typeHead <module:effect/Layer#Layer>; deus:typeArg0 ?out` is
the layer's `ROut` (`rules/15-types.n3`).

## API vs implementation

A reference from symbol `S` to target `T` is recorded as `deus:apiDependsOn` when its site is a
**type position** — a type annotation, type reference, heritage clause, type parameter, or anywhere
inside a type alias or interface — and as `deus:implDependsOn` otherwise (bodies, initializers,
call arguments). This is exactly the erased / not-erased boundary, so it agrees with the compiler:
`apiDependsOn` is what a consumer of `S`'s signature is coupled to; `implDependsOn` is what `S`
needs to run.

At file level the same split is `deus:importsType` vs `deus:imports`: an import binding used only
in type positions (or declared `import type`) is an `importsType` edge.

The API-only view is therefore a query — `deus:apiDependsOn+` from the package-public symbols — and
`deus:usesPackageInApi` is its package-level projection: the dependencies a package's public surface
exposes, which are the ones that must be `peerDependencies` or otherwise public.

## Resolution

The typescript analyzer binds identifier references to declarations using **import bindings and
top-level declarations only**. `Layer.effect` → import `Layer` → `module:effect/Layer#effect`;
`make(dir)` → top-level `make` in the same file → its symbol IRI; `Store` → import from
`'./Store.ts'` → resolved file → `file:…/Store.ts#Store`. A declaration inside a TypeScript `namespace` (`TestSchema.Person`) also
sees its sibling members by bare name, innermost namespace first. Local shadowing inside bodies is not
modeled; a reference that binds to nothing is counted in `deus:unresolvedReferences` on the file,
so the approximation stays measurable. Full scope analysis is a later step, not a design change.

### Finding usages

The parser records a dependency as its file wrote it, so a use of `proxyFetchLegacy` lands on the
declaration, on the barrel (`file:…/edge-client/src/index.ts#proxyFetchLegacy`) or on the module
member (`module:@dxos/edge-client#proxyFetchLegacy`). The `resolve-refs` pass links the last two to
the declaration with `deus:resolvesTo`, so every user of a declaration `D` is

```sparql
SELECT DISTINCT ?user WHERE { ?user deus:implDependsOn|deus:apiDependsOn ?r . ?r deus:resolvesTo? D }
```

and the MCP `usages` tool runs that query and groups the users by package and role. A user→declaration
edge is deliberately not materialised: it would restate every dependency edge, and `resolvesTo?` answers
the same question at query time.

A statement that declares nothing — `describe(…)`, `test(…)`, `registerX()` — runs at load time, and
most test files use what they test only there. Its references are dependencies of the file's
**top-level symbol**: `file:…/x.test.ts#top-level`, a `deus:Symbol` the file `deus:declares` with
`deus:name` and `deus:kind` `"top-level"`, `deus:exported false`, `deus:line` of the first such
statement that references anything, and `deus:apiDependsOn`/`deus:implDependsOn` like any declaration's.
The name is not an identifier, so no declaration shares the IRI. A file whose top-level statements
reference nothing has none. It is a symbol rather than edges from the `deus:File` because every
consumer of dependency edges — `usages`, `67-usage`, any rule joining `implDependsOn` — joins on a
symbol the file declares, and so sees these with no change. References inside those statements to
callback locals are not counted in `deus:unresolvedReferences`, which keeps that measure about
declarations.

## Snippets

`deus:snippet` is the declaration's source span with implementation replaced, produced by **span
slicing** — the source is copied byte-for-byte and only the spans below are substituted, so the
result is always valid TypeScript and never reformatted. Substitutions happen only where a
comment-only body is itself legal syntax:

| Node                          | Kept                                                                                   | Replaced                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| function, method, constructor | modifiers, name, type params, params with types, return type, every overload signature | body → `{ /*...*/ }`; expression-bodied arrow → `=> { /*...*/ }`                     |
| class                         | header, `extends`/`implements`, public member signatures, parameter properties         | method bodies; `#private` and `private` members removed                              |
| interface, type alias, enum   | everything                                                                             | nothing (object-type bodies collapse only under the budget)                          |
| variable with annotation      | `declare const x: T;`                                                                  | the initializer                                                                      |
| variable without annotation   | the initializer's shape: callee, arguments, `.pipe(...)` chain, literals to depth 3    | function bodies within; literal bodies deeper than 3 → `{ /*...*/ }` / `[ /*...*/ ]` |

The un-annotated variable is the case that matters here — `const Foo = Schema.Struct({...})`,
`Layer.effect(Tag, make(dir))`, `Schema.Struct(...).pipe(Type.Obj({ typename, version }))` — because
without a type checker the initializer _is_ the type information, and the depth rule keeps a
schema's fields while collapsing a nested handler body.

The parser is deliberately **generous**: when in doubt it keeps, because it cannot know which parts
of an initializer are the "definition" — for a schema that is the field object, for an operation the
`input`/`output` schemas but not the handler, for a layer only the callee and tag. That knowledge is
framework-specific and belongs downstream (a reasoner or the view that renders snippets), so the
parser's only hard rule is _function bodies always collapse_; literals are kept to depth 3 and a
**budget** of 1200 characters, beyond which the deepest kept literal and object-type bodies collapse
first. Pulling in more than a consumer needs is acceptable; dropping something it needed is not.
Framework-aware folding is a later step. Comments are dropped except the markers; the doc summary is
its own fact (`deus:doc`).

Invariant, enforced by test over the whole index: every emitted snippet re-parses with zero
diagnostics.

## Reasoning

A **reasoner** is a unit that reads the graph and emits quads into its own `graph:derived/<name>`.
Two kinds, one contract:

- **N3 rule files** (`rules/*.n3`) — run by the native rule engine over the facts whose
  predicates the file names (an unbound predicate reads the whole graph). Right for classification and joins that introduce
  vocabulary: small output, declarative, diffable.
- **JS passes** (`src/Reasoner.ts`, built in rather than loaded from `rules/`) — a `{ name, derive }`
  that reads the file graphs and replaces its own `graph:pass/<name>` (`Store.writePass`). Right for
  whatever N3 does badly: reachability that must be materialized (walk it with `deus:reexports+` in a
  query rather than a closure rule), string and path manipulation, anything needing a set, a sort, or
  a lookup table.

Passes run first, then the rule files in filename order, at the end of an indexing pass; each sees the file graphs plus the
derived graphs of reasoners before it, never its own previous output. A pass runs none of them when
the ledger records that this exact rule set already ran over the facts the store holds (a rule-set
signature and the store's write generation, in SQLite `meta`), so a pass run with `--no-reason`, or
interrupted before reasoning, is caught up by the next one. Each reasoner's graph is replaced
wholesale when it runs.
The ordering is the only dependency mechanism — `80-gaps.n3` negates `deus:describes`, so it sorts
after `70-specs.n3`, which concludes it.

The test for which kind to write: if the conclusion is a _class_ or a _join_, N3; if it needs a
_walk_ or a _computation_, JS. Never a closure rule over a whole relation in N3 (see Derived). The
one recursion shipped, `deus:publishedBy` in `65-packages.n3`, is seeded by the package entries and
follows only `deus:reexports`, so its output is the set of public files (a few thousand), not a
closure of the import graph. Two JS passes ship: `bind-types` (`src/TypeBinding.ts`), which
binds type terms across files into `graph:pass/bind-types`, and `resolve-refs`
(`src/ReferenceResolution.ts`), which states `deus:resolvesTo` for every reference into
`graph:pass/resolve-refs`; both run before the rule files, through the same resolution
(`src/worker/types/Bind.ts`). The computations specs need — glob compilation and reference
splitting — are still done by the parser (see SpecField).

Deleting a file does not dirty the files that imported it, so an unchanged importer keeps its
`deus:imports` edge to the departed file until that importer is itself reindexed.

## JSON-LD document

One document per file. A typescript document:

```json
{
  "@context": { "deus": "https://dxos.org/vocab/deus#", "…": "…" },
  "@id": "https://dxos.org/deus/file/src/Store.ts",
  "@type": "File",
  "path": "src/Store.ts",
  "language": "typescript",
  "size": 120,
  "mtime": 1730000000000,
  "hash": "9f86d0…",
  "inPackage": "https://dxos.org/deus/package/@dxos/code-index",
  "imports": ["https://dxos.org/deus/file/src/Ontology.ts"],
  "importsType": ["https://dxos.org/deus/file/src/worker/Protocol.ts"],
  "importsModule": ["effect/Layer", "quadstore"],
  "reexports": [],
  "unresolvedReferences": 0,
  "declares": [
    {
      "@id": "https://dxos.org/deus/file/src/Store.ts#Store",
      "@type": "Symbol",
      "name": "Store",
      "kind": "class",
      "exported": true,
      "line": 96,
      "extends": ["https://dxos.org/deus/module/effect/Context#Service"],
      "apiDependsOn": ["https://dxos.org/deus/file/src/Store.ts#Api"],
      "implDependsOn": [],
      "snippet": "export class Store extends Context.Service<Store, Api>()('code-index/Store') {}",
      "doc": "The whole persistence surface of the index."
    },
    {
      "@id": "https://dxos.org/deus/file/src/Store.ts#layer",
      "@type": "Symbol",
      "name": "layer",
      "kind": "variable",
      "exported": true,
      "line": 340,
      "constructedBy": ["https://dxos.org/deus/module/effect/Layer#unwrap"],
      "apiDependsOn": [
        "https://dxos.org/deus/module/effect/Layer#Layer",
        "https://dxos.org/deus/file/src/Store.ts#Store"
      ],
      "implDependsOn": [
        "https://dxos.org/deus/file/src/Store.ts#make",
        "https://dxos.org/deus/file/src/internal/sqlite.ts#clientLayer"
      ],
      "snippet": "export const layer = (dir: string): Layer.Layer<Store, StoreError> => { /*...*/ };"
    }
  ],
  "@included": [
    {
      "@id": "https://dxos.org/deus/file/src/Store.ts#Store/call/Context.Service/0",
      "@type": "CallSite",
      "callee": ["https://dxos.org/deus/module/effect/Context#Service"],
      "enclosedBy": "https://dxos.org/deus/file/src/Store.ts#Store",
      "line": 96,
      "literal": ["0=code-index/Store"]
    }
  ]
}
```

A `package.json` document carries the `File` node plus a nested `Package` node; a `moon.yml`
document carries the `File` node plus `{ "@id": "<pkg IRI>", "layer": "library" }`; a `.mdl`
document carries the `File` node, its frontmatter facts and `usesExtension` nodes, plus
`declaresBlock: [SpecBlock…]`, each block nesting its `hasField: [SpecField…]`. `FileGlob` nodes are
content-addressed like type terms: two documents naming one glob, or one extension URI, assert the
same node.

Invariants:

1. `@id` is the file IRI and `path`/`mtime`/`hash` always accompany it — they are the join keys with
   the SQLite ledger.
2. A specifier is recorded in exactly one of `imports`, `importsType`, `importsModule`.
3. Nodes are nested, so one document is the complete content of one file graph — a `Package` or
   `SpecBlock` node is asserted by the file that owns it, and by nothing else in that graph.
4. A document is never partial: a parse failure still produces the file node, with `parseError`
   entries and no `declares`.
5. Every `snippet` is valid TypeScript.
6. Nothing in a document names a framework: `constructedBy`/`extends`/`argument` hold IRIs derived
   from source text, and classification is a rule's job.
7. `deus:callee` is shared by Argument nodes, CallSites and `returnOf` type terms, so a rule about
   call sites joins `rdf:type deus:CallSite`.
