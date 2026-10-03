# Clusters: api-design, naming, style, docs

Input: 301 principles across 117 PRs. Clusters: 23 (dropped 11 single-PR clusters).

## 1. reuse-existing-mechanism: Before adding a new export, method, or type, check whether the codebase already has one and reuse it

- comments: 19 · PRs: 17 · authors: dmaretskyi, richburdon, wittjosiah · seed: one-mechanism-per-concern · existing: none · confidence: high
- principle: When a concern (an accessor, a lookup, a convenience wrapper, a way to widen an input, a way to enable a variant) is already served by an existing method, export, or interface member, extend or reuse it instead of adding a second one next to it.
- flag: a new method, export, or parameter that duplicates the behavior of an existing one under a different name or shape — a second deprecated method beside a working one, a new top-level accessor beside a nested one it could replace, a new helper that composes calls an existing function already composes, a new interface for something a base interface could absorb as an optional member.
- do not flag: a new API that covers behavior nothing existing provides, or an existing mechanism that is deliberately being replaced (with the old one removed in the same change, not left behind).
- fix: delete or alias the redundant surface and route callers through the existing one; when the existing API needs to grow, add an option or optional member to it rather than a parallel path.
- examples: https://github.com/dxos/dxos/pull/10208#discussion_r2542699339, https://github.com/dxos/dxos/pull/10233#discussion_r2559517424, https://github.com/dxos/dxos/pull/10288#discussion_r2613487602, https://github.com/dxos/dxos/pull/10303#discussion_r2617131760, https://github.com/dxos/dxos/pull/10463#discussion_r2763756895

## 2. prefer-branded-types-over-raw-primitives: Type an identifier or domain value with its specific branded type, not a raw string

- comments: 18 · PRs: 11 · authors: dmaretskyi, richburdon, wittjosiah · seed: none · existing: none · confidence: high
- principle: A field, parameter, or interface member that represents a domain concept with an existing branded/wrapper type (an id type, `DXN`, `EncodedReference`, `AutomergeUrl`, a model-name union) should carry that type, not the raw `string` or generic representation underneath it.
- flag: a signature or interface field typed `string` (or another bare primitive) where a specific branded type already exists in the codebase for that exact concept, and a case where a value is _widened_ from its branded type back to a raw string or a broader supertype during a refactor.
- do not flag: a genuinely public-API boundary that intentionally exposes the general/opaque type and narrows only where the caller needs the specific pieces (`Hypergraph.ts`, PR 10913 discussion r3298407304, is the canonical example of this legitimate exception) — mention it explicitly rather than flagging it; also do not flag a local variable deliberately given a generic name because its specific type is already obvious from context.
- fix: change the field/parameter type to the existing branded type (or add a `make`/constructor helper alongside a validator if the type lacks one); narrow with a type guard only at the point where the raw pieces are actually needed.
- examples: https://github.com/dxos/dxos/pull/9858#discussion_r2378527513, https://github.com/dxos/dxos/pull/10060#discussion_r2456783951, https://github.com/dxos/dxos/pull/10425#discussion_r2703212105, https://github.com/dxos/dxos/pull/10569#discussion_r2818414045, https://github.com/dxos/dxos/pull/12726#discussion_r3843833008

## 3. dont-leak-internal-api-through-public-surface: Keep internal implementation details out of a package's public API surface

- comments: 13 · PRs: 10 · authors: dmaretskyi, richburdon, wittjosiah · seed: none · existing: related to no-echo-internal-in-sdk (producer-side counterpart) · confidence: high
- principle: A symbol, field, or capability that only the package's own implementation needs — an internal schema helper, a raw resource handle, an invariant-checking predicate, a backend-selection parameter — must not be exported from the package's public entry point or threaded into a caller-facing signature.
- flag: an export from a package's root/public module that has no caller outside the package, a public wrapper that hands back a raw underlying handle instead of a limited proxy, an operation-facing API parameter that names which backend/mechanism serves the call, and an identifier exported from a module with no consumer outside it.
- do not flag: a symbol re-exported from an explicit `/internal` subpath (that subpath's contract is "unstable, package-internal"), or a genuine public factory that is the intended entry point.
- fix: move the symbol under the package's `/internal` path or drop the export entirely, route existing external callers through the intended public factory, and replace a backend-naming parameter with routing decided by the callee.
- examples: https://github.com/dxos/dxos/pull/9896#discussion_r2394516649, https://github.com/dxos/dxos/pull/10569#discussion_r2818420423, https://github.com/dxos/dxos/pull/10913#discussion_r3242582908, https://github.com/dxos/dxos/pull/11766#discussion_r3394471156, https://github.com/dxos/dxos/pull/11996#discussion_r3490434799

## 4. comment-hygiene: Keep comments current, load-bearing, and free of stale or decorative noise

- comments: 10 · PRs: 10 · authors: dmaretskyi, richburdon, wittjosiah · seed: none · existing: AGENTS.md/CLAUDE.md comment rule ("state why, one clause, end with a period; delete a comment the code already makes obvious") · confidence: high
- principle: A landed comment states settled reasoning the code cannot express on its own — not exploratory musing, not a restatement of what the code already says, not a stale TODO whose issue is resolved, not a reference to a transient migration-phase label that will be meaningless later, and not markdown-style dash decoration.
- flag: a comment containing rhetorical questions or "not sure if" language, a TODO whose underlying concern the diff already resolves, a comment that just repeats a config value's name, a comment naming a migration phase number instead of describing current behavior, and a `// --- Section ---` style separator.
- do not flag: a comment explaining a non-obvious rationale (why a version is pinned, why a workaround exists, what an automatic mechanism does _not_ guarantee) — that is exactly the kind of comment this rule wants kept.
- fix: trim the comment to the settled reasoning, delete it if the code is already self-explanatory, or rewrite it to describe current behavior rather than a project-phase label.
- examples: https://github.com/dxos/dxos/pull/10016#discussion_r2432238345, https://github.com/dxos/dxos/pull/10400#discussion_r2730260880, https://github.com/dxos/dxos/pull/10913#discussion_r3251102848, https://github.com/dxos/dxos/pull/11462#discussion_r3293964498, https://github.com/dxos/dxos/pull/13120#discussion_r4026008795

## 5. jsdoc-non-obvious-identifiers: Give a JSDoc comment to any parameter, field, or handle whose meaning isn't obvious from its name

- comments: 11 · PRs: 9 · authors: dmaretskyi, mykola-vrmchk, richburdon · seed: none · existing: none · confidence: high
- principle: An identifier-typed parameter, an opaque handle, a struct/schema field, or a re-implemented mechanism needs a doc comment saying what it actually refers to or how it works — an interface member that mirrors a documented implementation method should carry that same JSDoc, not be left bare.
- flag: an id/handle-typed parameter or field with no comment when its concrete referent (which kind of id, what the handle points to) isn't inferable from the name or type alone; an interface declaration whose implementing class has JSDoc that wasn't carried over; a re-implementation of prior logic (e.g. a serialization format) that drops the original's documentation.
- do not flag: a field whose name and type together already fully convey its meaning (`readonly id: ObjectId` needs no further comment), or an internal/private field not part of any public contract.
- fix: add a JSDoc comment above the declaration stating what the identifier/handle represents, or copy the JSDoc from the implementation onto the interface member it mirrors.
- examples: https://github.com/dxos/dxos/pull/9896#discussion_r2392070069, https://github.com/dxos/dxos/pull/10230#discussion_r2555568018, https://github.com/dxos/dxos/pull/10388#discussion_r2681042403, https://github.com/dxos/dxos/pull/10458#discussion_r2728068548, https://github.com/dxos/dxos/pull/10979#discussion_r3067836655

## 6. namespace-import-export-consistency: A namespace-style module's directive, filename, re-export, and import sites must all agree

- comments: 11 · PRs: 8 · authors: dmaretskyi, wittjosiah · seed: none · existing: import-as-namespace-is-all-or-nothing (code-style.mdl) · confidence: high
- principle: When a module is meant to be consumed as a namespace (`Foo.make`, `Foo.Options`), every one of the four parts — the `@import-as-namespace` directive, the capital-case filename, the barrel's `export * as Foo from './Foo'`, and every import site pulling in the whole namespace rather than a named member — must say the same name; a namespace import must never be renamed with a suffix (`Ns`, `Impl`) to dodge a collision, and an exported member must never repeat its own namespace's name (`StateStore.StateStore`).
- flag: an `export * as X from './Y'` where X and Y differ, a named member import from a module that carries the namespace directive, a namespace import renamed with an ad hoc suffix to avoid a naming collision, and a namespace member whose own name duplicates the namespace.
- do not flag: the established lowercase `*Internal` alias convention for internal barrels, or a module that plainly isn't a namespace module.
- fix: align the four parts to the same name, resolve a naming collision another way than renaming the import, and drop a redundant namespace-name prefix from an exported member.
- examples: https://github.com/dxos/dxos/pull/10230#discussion_r2555533828, https://github.com/dxos/dxos/pull/10419#discussion_r2706683822, https://github.com/dxos/dxos/pull/10470#discussion_r2745325350, https://github.com/dxos/dxos/pull/11054#discussion_r3123899608, https://github.com/dxos/dxos/pull/11233#discussion_r3189331709

## 7. consistent-field-and-list-ordering: Order struct fields, prop lists, and registered-entry lists by an established, consistent convention

- comments: 8 · PRs: 7 · authors: richburdon, wittjosiah · seed: none · existing: none · confidence: medium
- principle: Fields in a type/interface, props in a component, and entries in a registered list should follow one of the codebase's established orderings — identifying fields (id/key) first, callback-typed members grouped together, order mirroring a canonical/base API's field order, or plain alphabetical order for a flat registry — rather than whatever order they were added in.
- flag: a struct whose fields are scattered relative to an established sibling ordering, a props/type list that interleaves callback members with data members, and a new entry appended to an alphabetically-ordered list (like registered plugins) out of order.
- do not flag: an ordering with no established convention to follow, or a struct where every field is equally significant and no canonical sibling exists to mirror.
- fix: reorder the fields/props/entries to match the established convention (id/key first, callbacks grouped and last, or alphabetical, as the surrounding code already does).
- examples: https://github.com/dxos/dxos/pull/9897#discussion_r2411551582, https://github.com/dxos/dxos/pull/9957#discussion_r2412488433, https://github.com/dxos/dxos/pull/9965#discussion_r2415000119, https://github.com/dxos/dxos/pull/10060#discussion_r2456789265, https://github.com/dxos/dxos/pull/10245#discussion_r2572320517

## 8. options-object-with-defaults: A factory, constructor, or config parameter should be a defaulted options object, not required positional args

- comments: 5 · PRs: 5 · authors: dmaretskyi, wittjosiah · seed: none · existing: related to code-style skill's "options-bag types" convention · confidence: medium
- principle: A function taking configuration should accept a single options object with optional fields and sensible defaults (so callers aren't forced to pass an empty `{}`), should use a bounded-range shape (`{begin, end}`) instead of a single one-sided parameter when it may need both bounds later, and a public-facing interface's option types should be defined locally rather than importing wire/protocol types directly into the signature.
- flag: an options parameter with no default that forces every caller to write `fn({})`, a one-sided parameter (`until: n`) on a function likely to need the opposite bound too, and a public interface importing a type straight from the wire/protocol layer.
- do not flag: a function with only one meaningful parameter, where an options object would just add indirection.
- fix: give the options parameter a default value, change a one-sided parameter to a `{begin, end}`-shaped object, and define a local option type instead of depending on the protocol layer's own type.
- examples: https://github.com/dxos/dxos/pull/9886#discussion_r2380131044, https://github.com/dxos/dxos/pull/10569#discussion_r2828378774, https://github.com/dxos/dxos/pull/10985#discussion_r3075125191, https://github.com/dxos/dxos/pull/12615#discussion_r3794626002, https://github.com/dxos/dxos/pull/12765#discussion_r3925964267

## 9. name-for-general-behavior: Name a function, component, or concept for what it generally does, not the first narrow case it was written for

- comments: 5 · PRs: 4 · authors: mykola-vrmchk, richburdon, wittjosiah · seed: none · existing: none · confidence: medium
- principle: Once a helper, component, or concept is reused beyond the context it was first written in — or once its actual behavior turns out to differ from what its name implies — its name should describe its real, general purpose, not the narrow original use case or an adjacent-but-different concept.
- flag: a general-purpose helper still named after its first caller's situation, a function/property whose name suggests a related but different behavior than what it actually does, and a documented concept whose name only fits its most common use case.
- do not flag: a name that is intentionally narrow because the function genuinely is single-purpose and unlikely to widen.
- fix: rename to a name that covers the function's actual, general behavior, and relocate the definition if it now lives outside its original narrow module.
- examples: https://github.com/dxos/dxos/pull/9957#discussion_r2412494077, https://github.com/dxos/dxos/pull/10461#discussion_r2730284883, https://github.com/dxos/dxos/pull/10589#discussion_r2824991480, https://github.com/dxos/dxos/pull/12937#discussion_r3927233642

## 10. co-locate-tightly-coupled-code: Put a component's Props type, its tightly-coupled provider/hook, and its storybook story next to it

- comments: 4 · PRs: 4 · authors: richburdon · seed: none · existing: none · confidence: medium
- principle: A component's Props type, a context provider/hook that only that component uses, and its own storybook story belong in the same file or directory as the component, not split into a separate shared file or a loose top-level location.
- flag: a Props type defined in a separate shared types file when only one component uses it, a context root and its tightly-coupled provider/hook split across files, and a component placed as a loose file rather than in its own directory alongside its story.
- do not flag: a type or hook genuinely shared across multiple unrelated components — that one does belong in a shared location.
- fix: move the Props type, provider/hook, or story into the component's own file or directory.
- examples: https://github.com/dxos/dxos/pull/10595#discussion_r2834162361, https://github.com/dxos/dxos/pull/10649#discussion_r2875399053, https://github.com/dxos/dxos/pull/11023#discussion_r3151241628, https://github.com/dxos/dxos/pull/11072#discussion_r3131505926

## 11. no-cast-to-silence-type-checker: Do not cast to work around a type error; fix the type or add a runtime assertion

- comments: 11 · PRs: 3 · authors: wittjosiah · seed: none · existing: no-casts (non-negotiables.mdl) · confidence: high
- principle: `as any`, `as X`, and casting to construct a branded/validated value in a test all suppress a real type error instead of fixing it; a validator function (`X.isValid`) should be written as a type guard so calling it narrows the type and removes the need for a downstream cast.
- flag: any `as`/`as any` cast added to make a type error go away, a branded value built with a cast in a test instead of the type's real constructor, and a cast whose necessity was never actually verified (not load-bearing).
- do not flag: `as const`, or a cast this rule's existing repo definition already excludes.
- fix: fix the type at its source, replace the cast with a call to the type's real constructor/generator, or convert a validator into a type predicate so no downstream cast is needed. This is already the existing `no-casts` rule — this cluster is evidence it fires in the api-design/naming/style/docs categories too, not a new rule.
- examples: https://github.com/dxos/dxos/pull/10384#discussion_r2667427792, https://github.com/dxos/dxos/pull/10913#discussion_r3242587103, https://github.com/dxos/dxos/pull/11458#discussion_r3305801073

## 12. consistent-file-naming-within-folder: Keep filenames within one folder to a single, consistent naming convention

- comments: 3 · PRs: 3 · authors: dmaretskyi, richburdon · seed: none · existing: none · confidence: medium
- principle: Test files use lowercase kebab-case (not capitalized names), a storybook's default render component is named `DefaultStory`, and every file within one folder follows the same naming pattern (e.g. all verb-first) rather than mixing conventions.
- flag: a capitalized test filename, a storybook default export not named `DefaultStory`, and a folder with a mix of naming patterns across sibling files.
- do not flag: a filename convention genuinely established as an exception elsewhere in the same package.
- fix: rename the file to match the established convention for its folder/kind.
- examples: https://github.com/dxos/dxos/pull/10400#discussion_r2730264252, https://github.com/dxos/dxos/pull/10897#discussion_r3030830261, https://github.com/dxos/dxos/pull/11164#discussion_r3168787989

## 13. no-precision-loss-on-generic-refactor: When refactoring a typed API, do not widen its generic constraints, return type, or parameters to something less precise

- comments: 13 · PRs: 2 · authors: dmaretskyi, wittjosiah · seed: none · existing: related family to no-casts (widening away type precision is the type-level analogue of casting away precision) · confidence: high
- principle: A refactor must preserve or restore an API's original type precision — its generic constraints, return type, and parameter types — rather than settling for `any`, a broader supertype, a dropped generic parameter, or a union of overlapping representations because it was easier to get the refactor to compile.
- flag: a generic bound or return type that got wider or vaguer than the pre-refactor version with no stated reason, and a parameter signature that now accepts a union of two representations of the same concept instead of one canonical shape.
- do not flag: a deliberate, stated widening that is the actual point of the change (e.g. genuinely generalizing an API to a new use case).
- fix: restore the narrower/more specific type signature; if two representations must both be accepted, normalize to one canonical shape at the boundary instead of widening the signature.
- examples: https://github.com/dxos/dxos/pull/11458#discussion_r3305786817, https://github.com/dxos/dxos/pull/11458#discussion_r3305814229, https://github.com/dxos/dxos/pull/11458#discussion_r3305853801, https://github.com/dxos/dxos/pull/12521#discussion_r3757166756

## 14. namespace-brand-key-prefixing: Prefix an internal brand/annotation identifier string with its owning module's path

- comments: 3 · PRs: 2 · authors: dmaretskyi · seed: none · existing: none · confidence: medium
- principle: A string key used as a type-branding or annotation identifier must be namespaced with its owning package/module path (e.g. `~@dxos/schema/annotation/X`) so it cannot collide with a similarly-named key defined elsewhere in the codebase.
- flag: a bare, unqualified brand/annotation key string with no module-path prefix.
- do not flag: a key that is already scoped by construction (e.g. generated from a `Symbol`, which is inherently collision-free).
- fix: prefix the string with the owning package/module path.
- examples: https://github.com/dxos/dxos/pull/12143#discussion_r3552629282, https://github.com/dxos/dxos/pull/12521#discussion_r3757131116, https://github.com/dxos/dxos/pull/12521#discussion_r3757132845

## 15. event-handler-naming-convention: Name callback props and event handlers with the established on/handle + Noun + Verb pattern

- comments: 3 · PRs: 2 · authors: richburdon, thure · seed: none · existing: none · confidence: medium
- principle: Callback props follow the codebase's `on{Noun}{Event}`/`handle{Noun}{Verb}` convention (matching the Radix-derived pattern already in use), not an ad hoc name.
- flag: a callback prop or handler function named outside the on/handle-NounVerb pattern.
- do not flag: a non-callback prop, or a handler whose name is already conventional even if it reads slightly differently (e.g. established exceptions already in wide use).
- fix: rename the callback to fit the established convention.
- examples: https://github.com/dxos/dxos/pull/9918#discussion_r2400874804, https://github.com/dxos/dxos/pull/10595#discussion_r2834138663

## 16. reference-by-ref-not-raw-id: Reference another entity by a typed Ref, not a bare id string

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: none · existing: operations-take-refs-not-ids (code-style.mdl) · confidence: high
- principle: A field or operation input that identifies an existing ECHO object should be a `Ref`, not a raw id string, and the path that dereferences it should be covered by a test.
- flag: a field or operation input typed as a bare id/`Id: Schema.String` where the thing identified is an ECHO object.
- do not flag: a `spaceId`, a foreign id from an external system, or an id inside a stored record rather than an operation input — this repo's existing rule already carves out these exceptions.
- fix: change the field's type to `Ref<T>` and add a test that the consuming path dereferences it correctly. This restates the existing `operations-take-refs-not-ids` rule — evidence it applies to plugin/operation code in this slice too.
- examples: https://github.com/dxos/dxos/pull/12853#discussion_r3892150827, https://github.com/dxos/dxos/pull/13076#discussion_r3997028466

## 17. keep-parallel-apis-structurally-aligned: Give parallel/analogous modules and methods the same signature shape

- comments: 2 · PRs: 2 · authors: dmaretskyi, wittjosiah · seed: none · existing: none · confidence: medium
- principle: When two parallel modules expose equivalent operations (e.g. `Obj` and `Relation`), or two analogous methods return the same kind of result, they should share the same function name, parameter naming, and return shape so callers can treat them uniformly.
- flag: a sibling module's equivalent method with a differently-named parameter or a differently-shaped return type than its counterpart.
- do not flag: a genuine, documented difference in behavior between the two that justifies a different signature.
- fix: rename the parameter or align the return type/shape to match the sibling's existing convention.
- examples: https://github.com/dxos/dxos/pull/11458#discussion_r3313674902, https://github.com/dxos/dxos/pull/13272#discussion_r4061675764

## 18. barrel-imports-not-internal-paths: Import from a directory's barrel/index, not a specific file inside it

- comments: 2 · PRs: 2 · authors: richburdon, wittjosiah · seed: none · existing: partial (AGENTS.md "use barrel imports" is documented guidance but not yet an enforced .mdl rule) · confidence: medium
- principle: A consumer should import a symbol from the package or directory's barrel (`index.ts`), not by reaching into a specific internal file within it.
- flag: an import path that reaches past a directory's barrel into one of its individual files.
- do not flag: an import from inside the same package/directory the file being edited belongs to (internal relative imports within a module are expected), or a deliberate deep import documented as the package's own internal convention.
- fix: import the symbol from the parent barrel instead of the individual file.
- examples: https://github.com/dxos/dxos/pull/10719#discussion_r2923806591, https://github.com/dxos/dxos/pull/11393#discussion_r3293366732

## 19. consistent-private-field-convention: Use one privacy convention (`#field` or `_field`) consistently within a class

- comments: 2 · PRs: 2 · authors: dmaretskyi, richburdon · seed: none · existing: CLAUDE.md code style ("Prefer ES #private over the TypeScript private keyword in new code; _private is fine to keep") · confidence: medium
- principle: A class should not mix true ES `#private` fields with TypeScript `private`/underscore-prefixed fields for the same kind of member; pick one convention for the class.
- flag: a class with both `#field` and `_field`/`private field` members serving the same role.
- do not flag: a class that consistently uses `_field` throughout (CLAUDE.md allows keeping `_private` as-is; the flag is inconsistency, not the underscore convention itself).
- fix: convert the remaining private-by-convention fields to true `#private` fields (or vice versa) so the class is internally consistent.
- examples: https://github.com/dxos/dxos/pull/11308#discussion_r3247596264, https://github.com/dxos/dxos/pull/12214#discussion_r3581919834

## 20. setter-must-not-own-transaction: A low-level setter must not wrap its own batched-update transaction

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: none · existing: none · confidence: high
- principle: A property-setting helper or setter function should mutate an already-open draft/update directly and must not itself call the object's batched-update primitive (`update()`), because that prevents callers from batching multiple field writes into one transaction.
- flag: a setter function whose body opens and closes its own update/transaction wrapper internally.
- do not flag: the top-level public update/transaction entrypoint itself, whose whole job is to open that wrapper.
- fix: remove the internal update/batch wrapper from the setter; require callers to open the transaction themselves around one or more setter calls.
- examples: https://github.com/dxos/dxos/pull/11658#discussion_r3344564064, https://github.com/dxos/dxos/pull/12412#discussion_r3895339388

## 21. always-brace-conditional-bodies: Always use braces around a conditional body, even a single-line one

- comments: 2 · PRs: 2 · authors: richburdon · seed: none · existing: check first — likely already enforced by oxlint's `curly` rule; do not add as an LLM review rule without confirming it isn't already caught mechanically · confidence: medium
- principle: An `if` (or other conditional) body must be wrapped in braces even when it is a single statement.
- flag: a brace-less single-statement conditional body.
- do not flag: nothing — this is purely mechanical and, if not already linted, should be a lint rule rather than an LLM review rule.
- fix: add braces around the body.
- examples: https://github.com/dxos/dxos/pull/9965#discussion_r2414991423, https://github.com/dxos/dxos/pull/10595#discussion_r2834149556

## 22. deprecated-tag-must-be-accurate: Only mark an API `@deprecated` when it has both a real replacement and is actually being kept around for a transition

- comments: 2 · PRs: 2 · authors: dmaretskyi · seed: none · existing: none · confidence: medium
- principle: `@deprecated` should be used only when a concrete migration path exists (a TODO is more honest when no replacement exists yet), and conversely, an API deliberately kept around during a migration window should be tagged `@deprecated` so it is not mistaken for a first-class API.
- flag: an `@deprecated` tag with no named replacement, and a knowingly-transitional API left undocumented instead of tagged.
- do not flag: an `@deprecated` tag that does name its replacement.
- fix: change an unreplaced `@deprecated` to a TODO, or add the `@deprecated` tag (with a pointer to the replacement) to a transitional API that lacks one.
- examples: https://github.com/dxos/dxos/pull/10243#discussion_r2572134040, https://github.com/dxos/dxos/pull/10932#discussion_r3047009984

## 23. no-env-vars-in-low-level-modules: A low-level module driven by constructor params must not read environment variables itself

- comments: 2 · PRs: 1 · authors: dmaretskyi · seed: none · existing: none · confidence: high
- principle: Configuration derived from the environment must be resolved once at a higher layer and threaded down through explicit constructor parameters; a low-level component must never read an env var inline itself, because that makes it untestable in isolation and hides where its configuration actually comes from.
- flag: an environment-variable read (`process.env`/similar) inside a low-level class or module that is otherwise constructed with explicit parameters.
- do not flag: the single top-level bootstrap/config-loading module whose job is precisely to read the environment once.
- fix: remove the inline env-var read and pass the resolved value in via the constructor, sourced from the shared config at the top level.
- examples: https://github.com/dxos/dxos/pull/13288#discussion_r4079310094, https://github.com/dxos/dxos/pull/13288#discussion_r4080141477
- note: kept despite a single PR — the instructions allow this when the principle is unusually sharp, and "don't read env vars below the config-resolution boundary" is a sharp, broadly generalizable architecture rule, not an artifact of this PR's specific diff.

## Seed check

- one-mechanism-per-concern: 19 comments, 17 PRs in this slice — by far the best-supported seed here; keep as-is, it is the strongest single generalization in the whole dataset (see cluster 1).
- no-impossible-state-handling: 3 comments, 3 PRs (10230, 11383, 12256) — thin in this slice but each instance is sharp (require input types that already satisfy invariants, make an invalid input a type error, commit to one mutation model); keep, expect stronger support in the correctness-adjacent categories excluded from this slice.
- state-owned-once: 1 comment, 1 PR (11258) — too thin to judge from this slice alone; the one hit ("reference the real service tag instead of a hand-typed string duplicate") is a decent fit but needs support from other categories before drawing a conclusion.
- dependency-direction: 1 comment, 1 PR (12765) — same as above, too thin here; the hit ("a public application-facing interface should not import wire/protocol types") fits the seed's spirit but is single-instance in this slice.
- functions-before-classes: 0 comments in this slice — no support here; this seed's evidence, if any, lives in the categories not covered by this dataset.
- handle-errors-at-one-level: 0 comments in this slice — same as above, no support in api-design/naming/style/docs.

## Dropped

- entity-generic-bound-Type.Entity.Any: 11 comments, PR 10242 — sharp mechanical pattern but confined to one bulk-rename PR renaming `Type.Obj.Any` to `Type.Entity.Any`; too PR-specific to generalize as written.
- rename-getDXN-to-getURI-migration: 12 comments, PR 10913 — the "rename a function when its return type changes" principle is broadly true, but every instance here is the same DXN→URI migration inside the one giant PR the task flagged as a known outlier; drop rather than let it dominate the ranking.
- cli-help-text-concise-and-prompt-data-separation: 3 comments, PR 10323.
- spec-doc-needs-links-and-formal-grammar: 2 comments, PR 10913.
- readme-stays-in-sync-with-exported-api: 1 comment, PR 10230.
- generic-type-param-shadows-imported-module-name: 2 comments, PR 11458.
- mutation-callback-draft-param-mutable-at-source: 2 comments, PR 11458.
- singular-vs-batch-method-duplication: 2 comments, PR 11308.
- builder-api-also-needs-a-resolver-tag: 2 comments, PR 13261.
- incremental-method-needs-completion-flag: 2 comments, PR 10388.
- misc single-instance style/naming nits: ~20 comments spread one-per-PR across PRs 9896, 9897, 10176, 10244, 10897, 11054 (x2), 11233, 11385, 11660, 11839, 11895, 11974, 12143, 12256, 12937, 13013 — no repeated principle, each too narrow or too isolated to generalize from a single sighting.
