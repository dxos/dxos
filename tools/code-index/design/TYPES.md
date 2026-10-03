# Type propagation

`code-index` names the type of every symbol it emits, from the one file it is parsing, without a
TypeScript program or a type-checker service. This document fixes the type term the parser emits,
the inference rules it implements, and the bail-out policy. `design/ONTOLOGY.md` carries the RDF
vocabulary; the code is `src/worker/types/`.

The governing rule is **precision over recall**: an inferred type is either what `tsc` would say or
an explicit _unknown_. A wrong type is a bug; an unknown is a known limitation. The agreement
harness (`src/worker/types/agreement.ts`, `code-index types`) is how that claim is kept honest.

## Scope

- **Per file, local.** The worker sees one file's source plus `oxc-resolver`. It never reads an
  imported file. Everything that crosses the file boundary is named, not expanded.
- **Inside the parse step.** Inference runs over the same `oxc` AST the analyzer already walks, in
  the same worker, so it adds no IPC and no second parse.
- **Symbols are the output; every node is the means.** Inference computes types for whatever
  expressions a symbol's type depends on, but only the top-level symbols (`deus:Symbol`) get a
  `deus:hasType` fact. The harness scores every variable declarator, not only the emitted ones.

## The type term

A `Type` is a small algebraic data type (`src/worker/types/Term.ts`):

| Kind           | Meaning                                                                            | Canonical text                       |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| `unknown`      | Inference gave up here. Never emitted as a fact.                                   | `?`                                  |
| `primitive`    | `string number boolean bigint symbol null undefined void never any unknown object` | `string`                             |
| `literal`      | String, number, boolean, or bigint literal type.                                   | `"a"`, `1`, `true`, `1n`             |
| `ref`          | A named type, possibly applied: `Effect<A, E, R>`.                                 | `<iri><A, E, R>`                     |
| `typeof`       | The type of a named _value_: `typeof Store`.                                       | `typeof <iri>`                       |
| `union`        | Flattened, deduplicated, sorted by canonical text.                                 | `A \| B`                             |
| `intersection` | Flattened, deduplicated, order kept (it is significant).                           | `A & B`                              |
| `object`       | Properties (name, optional, readonly, type) + index signatures.                    | `{ readonly a: string; b?: number }` |
| `tuple`        | Elements (optional, rest), readonly flag.                                          | `readonly [string, number]`          |
| `function`     | Type parameters, parameters (optional, rest), return.                              | `<T>(T, number?) => T`               |
| `param`        | A reference to a type parameter, by name.                                          | `T`                                  |

**Symbols are IRIs**, chosen so a rule can match a type head with the same IRI it already uses for
`deus:constructedBy`:

- A declaration in this file: its symbol IRI, `file:<path>#<name>`.
- An import from a relative specifier: the resolved file's symbol IRI, `file:<resolved>#<path>`.
- An import from a bare specifier: the member IRI, `module:<specifier>#<path>` — e.g.
  `Layer.Layer` under `import * as Layer from 'effect/Layer'` is `module:effect%2FLayer#Layer`.
  `import { Layer } from 'effect'` reaches the same interface as `Layer.Layer` under `effect`; the
  canonicalizer rewrites `module:effect#Layer.Layer` to `module:effect%2FLayer#Layer` because the
  `effect` barrel publishes each module whole (`export * as Layer from './Layer.js'`). That table is
  the only package-specific knowledge in the term layer, and it is limited to `effect`.
- A global: `lib:<name>` (`https://dxos.org/deus/lib#Array`), for the ES/DOM library types and
  utility aliases (`Array`, `Promise`, `Record`, `Partial`, …) — only names on an explicit list.

A named type is **not expanded**: `Effect.Effect<number>` is
`ref(module:effect%2FEffect#Effect, [number, never, never])` — defaults filled in, because that is
what `tsc` reports — never the structure of the interface. An imported type alias is named the same
way, even when it aliases a primitive: `x: Id` with `import type { Id } from './id.ts'` is
`ref(file:id.ts#Id)`. That is TypeScript-equivalent but unexpanded; the harness scores it as
agreement when the alias's declared type is what `tsc` reports.

`typeof X` for an imported value is likewise exact but unevaluated: the analyzer cannot know the
declared type of a value in another file, but it can name it. Rules can evaluate it across files
(the importer's `typeof X` joined with X's own `deus:hasType`).

### Normalization (so equal types have equal text)

- Unions flatten, drop `never`, deduplicate, absorb a literal into its present base primitive
  (`1 | number` → `number`), collapse `true | false` to `boolean`, and sort by text. A union
  containing `any` is `any`; one containing `unknown` (the TS type) is `unknown`.
- A union with one member is that member; with none it is `never`.
- An optional property's or parameter's type has `undefined` removed: optionality is the flag.
- Literal _freshness_ (whether `const x = 1` widens when it flows into a mutable location) is an
  inference-only flag, invisible in the text.

## Inference rules covered

TypeScript semantics under `strict: true` (the repo's setting), `exactOptionalPropertyTypes` and
`noUncheckedIndexedAccess` off.

| Construct                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Literals                    | Fresh literal types; a no-substitution template is a string literal. A template with substitutions is unknown: `tsc` folds literal operands into a literal (`` `a${1}` `` is `"a1"` in a `const`).                                                                                                                                                                                                                                                              |
| `const x = e` / `let x = e` | `const` keeps the literal; `let`/`var` widen fresh literals (`1` → `number`).                                                                                                                                                                                                                                                                                                                                                                                   |
| Annotation `x: T`           | `T`, converted from the type syntax (see below).                                                                                                                                                                                                                                                                                                                                                                                                                |
| Object literal              | Property types widened; methods and arrows become function types. Spread, computed keys, getters → unknown.                                                                                                                                                                                                                                                                                                                                                     |
| Array literal               | `Array<best common type>` widened; empty or spread → unknown.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `e as const`                | Literals kept, object properties readonly, arrays become readonly tuples.                                                                                                                                                                                                                                                                                                                                                                                       |
| `e as T`, `<T>e`            | `T`.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `e!`                        | `e` without `null`/`undefined`.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Functions                   | Parameters need an annotation or a default; the return type is the annotation, or the widened union of `return` expressions (`void` with none; `Promise<…>` when `async`). Generators → unknown unless a model consumes them.                                                                                                                                                                                                                                   |
| Calls                       | Non-generic callee: its return type. Generic local callee: parameters unified with arguments, with TypeScript's literal-widening rule for inferred type parameters. Overloads → unknown.                                                                                                                                                                                                                                                                        |
| `new C(…)`                  | `C` for a non-generic local class; explicit type arguments are honored.                                                                                                                                                                                                                                                                                                                                                                                         |
| Member access               | Property of a known object type; `length` of a string, array, or tuple; a namespace member is a `typeof` of its member IRI.                                                                                                                                                                                                                                                                                                                                     |
| Destructuring               | Object patterns over known object types, array patterns over tuples; defaults → unknown.                                                                                                                                                                                                                                                                                                                                                                        |
| `await e`                   | `Promise<T>` → `T`; a known non-thenable type → itself.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Operators                   | Arithmetic on numbers → `number`; `+` with a string → `string`; comparisons, `!`, `in`, `instanceof` → `boolean`; `typeof` → its string-literal union; `c ? a : b` → union of the branches when no subtype reduction could apply.                                                                                                                                                                                                                               |
| Type syntax                 | Keywords, literals, references (with type arguments), unions, intersections, arrays, tuples, object literals, function types, `readonly T[]`, `typeof x`, parentheses. A local alias is named, except where `tsc` certainly makes it transparent (a keyword, literal, array, tuple, `typeof`, or a reference to an interface or class); naming is always TypeScript-equivalent. Conditional, mapped, indexed-access, `keyof`, template-literal types → unknown. |
| References                  | A variable or parameter read is its declared type — unless `tsc` might narrow it (next section).                                                                                                                                                                                                                                                                                                                                                                |

### Models: Effect idioms

The rule files care about layers, services, schemas, and effects, and those are built from library
calls whose signatures live in another package. They are covered by hand-written **models**
(`src/worker/types/models.ts`): small functions from argument types to a result type, each keyed by
the canonical member IRI of the callee. A model bails out exactly like the core rules do. Every
model has a fixture in the harness, checked against `tsc` on the installed `effect` version.

| Callee                                                                                   | Result                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class S extends Context.Service<Self, Shape>()('id')`                                   | The class's `Key<Self, Shape>` view, used by the layer models.                                                                                                                              |
| `Effect.succeed(a)` / `Effect.fail(e)` / `Effect.sync(() => a)` / `Effect.void`          | `Effect<A, never, never>` / `Effect<never, E, never>` / …                                                                                                                                   |
| `Effect.gen(function* () { … })`                                                         | `A` = widened union of returns; `E`, `R` = unions over the `yield*` operands (an `Effect`, or a service class, which yields its shape and requires itself). Any unknown `yield*` → unknown. |
| `Layer.succeed(S, …)` / `Layer.sync(S, …)`                                               | `Layer<S, never, never>` for a local service class `S`.                                                                                                                                     |
| `Layer.effect(S, eff)`                                                                   | `Layer<S, E, Exclude<R, Scope>>`, the exclusion evaluated over named members.                                                                                                               |
| `Layer.mergeAll(…)` / `Layer.merge(a, b)` / `Layer.provide(a, b)` and their `pipe` forms | Unions of the parts; `provide` removes the provided outputs from the inputs.                                                                                                                |
| `Schema.String` / `Number` / `Boolean` …, `Schema.Struct({…})`                           | The schema interface; `Struct<{ readonly …: … }>` (the `const` type parameter makes the fields readonly).                                                                                   |

A service tag imported from another file has an unknown `Key`, so a layer built from it gets an
unknown `ROut`; `E` and `RIn` may still be known, and are emitted.

### Control flow

`tsc` types a _reference_ by its flow type: `typeof x === 'function' ? x() : x` reads `x` narrowed in
each branch, and `let x: string | undefined = 'a'` reads as `string` afterwards. The propagator does no
flow analysis, so it refuses every case where narrowing could apply:

- A variable or parameter with **any** reference in a guard position anywhere in the file — an `if`,
  loop, `switch` or `?:` test, either side of `&&`/`||`/`??`, an equality/`instanceof`/`in` operand,
  under `typeof`, an assignment target, or an argument of a statement-level call (assertion
  functions) — reads as unknown everywhere. Coarse, and deliberately so: a guard on an alias of the
  condition (`const isString = typeof x === 'string'`) narrows too.
- An annotated variable with an initializer reads as unknown when its declared type could be a union
  (a union, or a name that might alias one): the initializer narrows it.
- A function expression without `return` whose end might be unreachable is unknown rather than
  `void`: `() => { process.exit(1) }` is `() => never` to `tsc`, because a statement-level call to a
  `never`-returning function ends it. Only calls to functions typed here with another return type are
  known to return. A function _declaration_ is `void` regardless.
- `await` over a type parameter is `Awaited<T>`, left unknown.

## Bail-out policy

- Anything not in the tables above is `unknown`. So is any rule whose input is unknown, except
  where TypeScript's own result does not depend on it (e.g. `typeof x` the operator).
- **Partial terms are allowed**: `Layer<?, never, never>` says more than `?`, and every known part
  is held to the same standard. `?` leaves are never emitted as facts; the containing term is
  emitted with the unknown position simply absent.
- Unions that `tsc` would subtype-reduce (two or more non-primitive members in a return-type or
  conditional union) are unknown rather than approximated.
- A cycle (a `const` whose initializer refers back to itself) is unknown.
- A term larger than 64 nodes is not emitted (it is still scored).

## Agreement harness

`code-index types [--sample N] [files…]` and `src/worker/types/agreement.test.ts`:

1. Build a `tsc` program (`@typescript/typescript6`, the JS compiler API) over the files, with the
   repo's `strict` settings and `customConditions: ['source']`, so `@dxos/*` resolve to source the
   way `oxc-resolver` resolves them.
2. Convert each checker type to a `Type` term, naming symbols through the file's own import
   bindings exactly as the propagator does, so the comparison is term equality.
3. Score every variable declarator and function declaration, nested ones included: **agree** (the
   terms match), **partial** (every known position matches; some are unknown), **unknown** (the
   propagator bailed), **disagree** (anything else), and **skipped** (`tsc` has no answer to hold the
   propagator to: `any` from an import it could not resolve — at the top or nested — or a type the
   term language cannot express).

Two spellings of one type are not a disagreement, and the harness resolves them through the checker
rather than by loosening the comparison:

- Import routes: `FC` imported from `react` and `React.FC` through the default import are one symbol.
- Named types: a ref carries the source span of the syntax it was read from, and the harness compares
  `tsc`'s own reading of that node (`getTypeFromTypeNode`) — after checking that `tsc` binds the name
  to a symbol the ref's IRI is a route to, and that each written type argument agrees. That is what
  verifies an imported alias, a defaulted argument, or a generic alias `tsc` reduces.
- Aliases: a local or imported alias without arguments is expanded through its declared type, and a
  union member that names a union alias is flattened (`AST | undefined` with `AST` a union).

Disagreements are bugs: the fixture test fails on any, and the repo sample's rate is tracked in the
PR.

## RDF

See `design/ONTOLOGY.md` → "Types". In short: `<symbol> deus:hasType <type node>`, where the type
node's IRI is content-addressed (`https://dxos.org/deus/type/<hash of canonical text>`), so the
same type in one file is one node, and the structure is spelled out with `deus:typeKind`,
`deus:typeHead`, `deus:typeArg0…`, `deus:typeMember`, … for rules to match.
