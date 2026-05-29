# @dxos/extractor — Template-driven object extraction

Status: Implementing (design approved 2026-05-28)

## 1. Summary

Plugins register **extractors** that take a source ECHO object (e.g. a `Message` or calendar
`Event`) and emit one or more ECHO objects (`Trip`, `Person`, `Organization`,
`Markdown.Document`, …), creating or updating existing objects as appropriate.

This package generalises the former `plugin-inbox` `MessageExtractor` capability into a
framework-free `ObjectExtractor` and replaces brittle regex parsing with a **template-driven**
extractor:

- **LLM** (cheap/fast model) does _entity recognition + field extraction only_: given the
  source text + a prompt + a structured-output schema, it returns well-formed candidate
  objects. No DB awareness, no tools.
- **Framework** does the deterministic work: **merge** each candidate against existing objects
  via the `Resolver` (identity keys), and **assemble** the graph — containment
  (`Obj.setParent`), relations (e.g. `Message → Trip`), and tags.

Extractors return a _description_ (`ExtractResult`); the **dispatcher** is the single writer,
with an `onProposal` seam (default no-op) so a future preview/edit Dialog or a server-side
trigger can interpose before any write.

## 2. Package boundary

`@dxos/extractor` lives in `packages/core/compute` and depends only on `@dxos/compute`
(`Operation`), `@dxos/echo`, `@dxos/ai`, `@dxos/types`, `@dxos/effect`, `@dxos/log`, `effect`,
`@effect/ai`. **No `@dxos/app-framework`, no UI** (satisfies the operations-stay-UI-free lint
guard). `ExtractorRegistry` is a plain Effect service — upstream of, and independent from,
app-framework Capabilities.

The package is **not** `private` — it may be consumed by EDGE (server-side triggers).

## 3. Two-tier model

| Tier                   | Input                     | Mechanism                | Lives in                       | Examples                                |
| ---------------------- | ------------------------- | ------------------------ | ------------------------------ | --------------------------------------- |
| **Structured mappers** | external API JSON         | deterministic code       | `plugin-inbox`                 | gmail/calendar/people sync mappers      |
| **LLM extractors**     | unstructured text/objects | LLM + framework assembly | extractor registered by plugin | trip, contact-from-signature, summarize |

Both tiers share this package's `Resolver`. "Migrating sync" = **moving `Resolver` down** and
re-pointing imports; the deterministic mappers keep their behaviour.

## 4. Core API

```ts
export interface ExtractInput {
  readonly db: Database.Database;
  readonly source: Obj.Any;
}

export interface ExtractResult {
  readonly created: ReadonlyArray<Obj.Any>;
  readonly updated?: ReadonlyArray<Obj.Any>;
  readonly relations: ReadonlyArray<Relation.Unknown>;
  readonly tags?: ReadonlyArray<{ label: string; hue?: string }>;
  readonly summary?: string;
}

export interface ObjectExtractor {
  readonly id: string;
  readonly title: string; // Short human-facing label (toolbar action).
  readonly description: string;
  readonly kinds: readonly string[];
  readonly sourceTypes: readonly string[]; // ECHO typenames this extractor applies to.
  match(source: Obj.Any): MatchResult;
  readonly operation?: Operation.Definition<ExtractInput, ExtractResult>; // Optional first-class op.
  extract(input: ExtractInput): Effect.Effect<ExtractResult, ExtractError, Operation.Service | Resolver | AiService.AiService>;
  readonly createRelation?: boolean;
}
```

`ExtractResult.tags` is opaque to the core dispatcher — the `plugin-inbox` bridge interprets
it against the owning `Mailbox`.

### 4.1 ExtractorRegistry

```ts
export class ExtractorRegistry extends Context.Tag('@dxos/extractor/ExtractorRegistry')<
  ExtractorRegistry,
  { readonly all: () => Effect.Effect<ReadonlyArray<ObjectExtractor>> }
>() {}

export const fromExtractors = (extractors: ReadonlyArray<ObjectExtractor>) => Layer.succeed(...);
```

### 4.2 Dispatcher + onProposal

```ts
export interface DispatchInput extends ExtractInput {
  readonly extractorId?: string; // Explicit invocation bypasses match().
}

export interface DispatchOptions {
  readonly onProposal?: (result: ExtractResult) => Effect.Effect<ExtractResult | undefined>;
  readonly provenance?: (params: ProvenanceParams) => Relation.Unknown | undefined;
}
```

`dispatch(input, options)` selects an extractor (by `extractorId` — which bypasses `match` — or
the highest-confidence `match`, pre-filtered by `sourceTypes`), runs `extract`, passes the result
through `onProposal` (default identity; `undefined` cancels), then persists: `db.add` created
objects, attach provenance relations (via the `provenance` factory) for top-level objects, persist
extra relations.

## 5. Resolver + getOrCreate

`Resolver` (moved verbatim from `plugin-inbox/services/resolver.ts`) is the per-typename
identity-resolution registry: `resolve(type, input) => Effect<instance | undefined>`. Inbox
keeps its domain resolvers (Person-by-email, Organization-by-domain) but imports `Resolver`
from here. Calendar's attendee→Person resolution is unchanged.

```ts
// Returns a well-formed, UNCOMMITTED object. Never calls db.add.
export const getOrCreate: <T>(
  type,
  candidate,
  identity,
) => Effect.Effect<{ object: T; created: boolean }, never, Resolver>;
```

Generalises `upsertPerson` (foreignKey), `buildContactFromActor` (email), and the trip
extractor's `findExistingFlight` (number+date).

## 6. ExtractionTemplate (Effect Schema)

`ExtractionTemplate` and `TargetSpec` are **Effect Schemas** (`Schema.Struct`) so they are
validatable and ECHO-storable for the future user-authored path. Code-registered templates ship
as defaults today (hybrid).

```ts
const TargetSpec = Schema.Struct({
  type: Schema.String, // ECHO typename to extract.
  identity: Schema.optional(IdentitySpec), // How to find an existing instance for merge.
  parent: Schema.optional(Schema.String), // Parent target type (containment).
  relations: Schema.optional(Schema.Array(RelationSpec)), // Relations from source to this target.
});

const ExtractionTemplate = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  kinds: Schema.Array(Schema.String),
  sourceTypes: Schema.Array(Schema.String),
  prompt: Schema.String,
  model: Schema.optional(Schema.String), // default '@anthropic/claude-haiku-4-5'.
  targets: Schema.Array(TargetSpec),
  tags: Schema.optional(Schema.Array(Schema.Struct({ label: Schema.String, hue: Schema.optional(Schema.String) }))),
});
```

`makeTemplateExtractor(template, { payloadSchema, build })` produces an `ObjectExtractor`. The
code template supplies the Effect `payloadSchema` for `LanguageModel.generateObject` and a
`build` mapping from validated payload to typed ECHO candidates (typed construction of nested
unions such as `Segment.details` requires code); identity/parent/relations/tags wiring is
driven by the `TargetSpec` data. The fully-declarative ECHO-template path (schema-by-typename)
is a follow-up.

### Runtime

1. **LLM phase**: extract source text → `LanguageModel.generateObject({ schema: payloadSchema, prompt })`
   → validated payload → `build(payload)` → typed candidates. No DB.
2. **Assembly phase**: per candidate `getOrCreate` (merge vs create) → wire `parent`
   (`Obj.setParent`) → build `relations` from source → collect `tags` → return `ExtractResult`.

## 7. Migrations

1. New package: interfaces, schemas, registry, dispatcher, `Resolver`, `getOrCreate`, template
   engine. Move `parseSignature` + its test + fixture here (kept for later reuse).
2. Move `Resolver` out of `plugin-inbox`; re-point `inbox-resolver.ts`, mappers, sync ops, tests.
3. Generalise `MessageExtractor → ObjectExtractor`; re-home `contact` + `summarize`. Drop
   `targetTripId`. `ExtractMessage` becomes a thin bridge over the core dispatcher that also
   applies tags to the `Mailbox`.
4. Trip → `ExtractionTemplate` (Trip⊃Segment, Booking→Trip, Message→Trip, `travel` tag).
5. Rename `operations/google/people` → `operations/google/contacts`.

No compatibility shims — every call site updated in the same change.

## 8. Testing — fixture-driven

- **Source fixtures** are `.md` files (message bodies) loaded via a `parseFixtureMessage` helper.
- **LLM determinism**: template-extractor tests mock `LanguageModel.make({ generateObject })`
  with canned structured output (no live API), validating the assembly path. Accuracy of the
  real model is validated separately.
- **Merge/assembly**: unit-tested with `EchoTestBuilder` + a `Resolver.Mock`, asserting
  create-vs-update and graph wiring.
- **Regression bar**: the existing trip assertions (Trip name SFO/LHR, Booking `ABC123`,
  segment dedupe by number+date, gate-change update).
- **Dispatcher**: `onProposal` passthrough, mutation, and cancel (`undefined` ⇒ no writes).

## 9. Out of scope (follow-ups)

- Preview/edit/cancel Dialog wired to `onProposal`.
- `ExtractionTemplate` authoring UI; fully-declarative ECHO-template (schema-by-typename) path.
- Agent/Routine references to templates.
- Agentic (tool-calling) extraction path.
