# ObjectExtractor — Template-driven object extraction

Status: Draft (design approved in brainstorming, pending spec review)
Date: 2026-05-28
Branch: `claude/object-extractor`

## 1. Summary

Today `plugin-inbox` defines a `MessageExtractor` capability: plugins register extractors
that take a `Message` and emit ECHO objects (`Trip`, `Person`, `Organization`,
`Markdown.Document`, …). The travel extractor (`plugin-trip`) is the last regex-based holdout
— brittle, airline-specific, and hard to extend.

This design:

1. **Generalises** `MessageExtractor` → `ObjectExtractor` and pushes it down from
   `plugin-inbox` into a new framework-free package **`@dxos/extractor`** (in
   `packages/core/compute`). The source becomes any ECHO object, not just `Message`.
2. **Replaces brittle regex parsing** with a **template-driven extractor**: a cheap/fast LLM
   does *entity recognition + field extraction only*, returning well-formed candidate objects;
   the **framework** deterministically merges them against existing objects and assembles the
   graph (containment, relations, tags).
3. **Factors the identity-resolution `Resolver`** out of `plugin-inbox` into `@dxos/extractor`
   as the shared merge backbone — the same service Calendar already uses to map attendee
   emails to `Person` objects.

Templates are **hybrid**: code-registered defaults (TS) ship today; an `ExtractionTemplate`
ECHO schema is defined so user-authored templates are possible later. The template format is
designed so Agents/Routines can reference templates, but that wiring is out of scope here.

## 2. Goals / Non-goals

### Goals

- A framework-free `@dxos/extractor` package: `ObjectExtractor`, `ExtractInput`,
  `ExtractResult`, `ExtractError`, `ExtractorRegistry`, the generic dispatcher, the `Resolver`
  identity primitive, and a reusable template-driven extractor.
- Generalise the source from `Message` to any `Obj.Any`; drop the trip-specific
  `targetTripId` leak from `ExtractInput`.
- LLM = pure structured-output extraction (no DB awareness, no tools). Framework = merge +
  assembly. Cheap, deterministic, robust on small models.
- Migrate the trip extractor to a declarative template with no behavioural regression
  (existing fixtures still pass).
- Re-home `contact` and `summarize` extractors onto `ObjectExtractor`.
- Preserve the `extract`-returns-a-description / dispatcher-persists seam, and add an
  `onProposal` intercept (defaults to identity/noop) so a future preview/edit Dialog or a
  server trigger can interpose without touching extractors.
- Keep deterministic API mappers (gmail/calendar/people sync) working unchanged on the
  factored-out `Resolver`.

### Non-goals (explicitly deferred)

- Template **authoring UI** (creating/editing `ExtractionTemplate` objects in Composer).
- The preview/edit/cancel **Dialog** itself (only the `onProposal` seam is built now).
- **Agentic** query/tool-calling extraction (the single-call structured-output path is built;
  the interface leaves room for a tool-driven path later).
- **Agent/Routine** references to templates (format is forward-compatible only).
- Re-writing deterministic API mappers as LLM extractors (they stay deterministic).

## 3. Architecture

### 3.1 Package: `@dxos/extractor` (`packages/core/compute/extractor`)

Dependencies (allowed): `@dxos/compute` (Operation), `@dxos/echo`, `@dxos/ai`, `@dxos/types`,
`@dxos/log`, `effect`, `@effect/ai`.

**Forbidden**: `@dxos/app-framework`, `@dxos/react-*`, any UI. The package must satisfy the
existing "operations must stay UI-free" lint guard. `ExtractorRegistry` is a plain Effect
`Context.Tag` service — it is *upstream of and independent from* app-framework Capabilities.

`"private": true` in `package.json` (new-package rule).

### 3.2 Two-tier extraction model

Sources reach ECHO via one of two tiers; both share `@dxos/extractor`'s `Resolver`:

| Tier | Input | Mechanism | Lives in | Examples |
| --- | --- | --- | --- | --- |
| **Structured mappers** | external API JSON | deterministic code | `plugin-inbox` | gmail/calendar/people sync mappers |
| **LLM extractors** | unstructured text/objects | LLM + framework assembly | extractor registered by plugin | trip, contact-from-signature, summarize |

"Migrating sync" means **moving `Resolver` down** and re-pointing imports — the deterministic
mappers do not change behaviour.

## 4. Core interfaces (`@dxos/extractor`)

### 4.1 `ExtractInput` / `ExtractResult` / `ExtractError`

Generalise `ExtractInput.message: Message` → `source: Obj.Any`; drop `targetTripId`.

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

export class ExtractError {
  readonly _tag = 'ExtractError';
  constructor(readonly message: string, readonly cause?: unknown) {}
}
```

`ExtractResult` is unchanged in shape — it is already source-agnostic. Note: `tags` were
specific to a `Mailbox`; tag application stays in the *plugin-inbox dispatcher bridge*, not in
the generic core dispatcher (see §7). The core `ExtractResult` keeps `tags` as opaque data the
bridge interprets.

### 4.2 `ObjectExtractor`

`match` takes an `Obj.Any` source (extractors guard on type internally). `extract` returns a
*description*; it never writes.

```ts
export interface ObjectExtractor {
  readonly id: string;
  readonly description: string;
  readonly kinds: readonly string[];
  /** Source ECHO typename(s) this extractor applies to (e.g. Message, Event). */
  readonly sourceTypes: readonly string[];
  match(source: Obj.Any): MatchResult;
  readonly operation: Operation.Definition<ExtractInput, ExtractResult>;
  extract(input: ExtractInput): Effect.Effect<ExtractResult, ExtractError, Operation.Service>;
  readonly createRelation?: boolean;
}
```

`sourceTypes` is new — it lets the dispatcher pre-filter candidate extractors by source type
before calling `match`, so a `Message` never runs a calendar-only extractor's matcher.

### 4.3 `ExtractorRegistry` service

```ts
export class ExtractorRegistry extends Context.Tag('@dxos/extractor/ExtractorRegistry')<
  ExtractorRegistry,
  { readonly all: () => Effect.Effect<ReadonlyArray<ObjectExtractor>> }
>() {}

export const fromExtractors = (extractors: ReadonlyArray<ObjectExtractor>) =>
  Layer.succeed(ExtractorRegistry, ...);
```

Core never imports app-framework. `plugin-inbox` builds this layer from
`Capability.getAll(...)` (see §7).

### 4.4 Dispatcher + `onProposal` intercept

A generic dispatcher operation (moved out of `plugin-inbox/extract-message.ts`) that:

1. resolves extractors from `ExtractorRegistry`, pre-filters by `source` type,
2. picks one (by `extractorId` or highest-confidence `match`),
3. runs `extract` → `ExtractResult`,
4. passes the result through `onProposal` (default = identity) — the single seam where a
   preview/edit Dialog or a server policy can mutate or veto the proposal **before** any
   write,
5. persists: `db.add` created objects, attach `ExtractedFrom` relations for top-level objects
   (respecting `createRelation` and `Obj.getParent`), persist extra relations.

```ts
export interface DispatchOptions {
  readonly extractorId?: string;
  /** Interpose before persistence. Defaults to identity (no-op). Returning `undefined`/empty cancels. */
  readonly onProposal?: (result: ExtractResult) => Effect.Effect<ExtractResult | undefined>;
}
```

The current code already has the right shape (extractor returns description, dispatcher is the
sole writer); this design only generalises the source and inserts `onProposal`.

**Tag application** is NOT in the core dispatcher (it needs `Mailbox`). The plugin-inbox bridge
wraps the core dispatcher and applies `result.tags` to the owning Mailbox afterwards (current
logic, relocated).

## 5. Resolver (factored to `@dxos/extractor`)

Move `services/resolver.ts` (`Resolver`, `resolve`, `fromResolvers`, `ResolverType`,
`ResolverMap`) verbatim into `@dxos/extractor` — it already carries `// TODO: Factor out.`. It
is the per-typename identity-resolution registry: `resolve(type, input) => Effect<instance | undefined>`.

`inbox-resolver.ts` (Person-by-email, Organization-by-domain, `Mock`) **stays in plugin-inbox**
— those resolvers are domain-specific — but imports `Resolver` from `@dxos/extractor`.
Calendar's attendee→Person resolution is unchanged.

### 5.1 `getOrCreate` / merge primitive

Add to `@dxos/extractor` the merge step that the template extractor and any code extractor can
reuse. It returns a **well-formed, uncommitted** object (never writes):

```ts
/**
 * Resolve a candidate against existing objects via the Resolver. If a match exists, merge the
 * candidate's defined fields into it (returning {object, created:false}); otherwise return the
 * candidate as-is (created:true). NEVER calls db.add — the dispatcher persists.
 */
export const getOrCreate: <T>(type, candidate, identity) =>
  Effect.Effect<{ object: T; created: boolean }, never, Resolver>;
```

This generalises `upsertPerson` (foreignKey), `buildContactFromActor` (email), and the trip
extractor's `findExistingFlight` (number+date) into one primitive parameterised by the
`Resolver` lookup.

## 6. Template-driven extractor

A single reusable `ObjectExtractor` implementation parameterised by an `ExtractionTemplate`.

### 6.1 Template shape

```ts
export interface ExtractionTemplate {
  readonly id: string;
  readonly description: string;
  readonly kinds: readonly string[];
  readonly sourceTypes: readonly string[];
  /** How to detect candidacy cheaply, before invoking the LLM (keywords/domains/regex on source). */
  readonly match: MatchSpec;
  /** Instruction/context handed to the LLM alongside the source text. */
  readonly prompt: string;
  /** Default cheap model. */
  readonly model?: string; // default '@anthropic/claude-haiku-4-5'
  /** Target object types the LLM should extract, with merge identity + graph wiring. */
  readonly targets: ReadonlyArray<TargetSpec>;
  /** Tags to apply to the source after extraction. */
  readonly tags?: ReadonlyArray<{ label: string; hue?: string }>;
}

export interface TargetSpec {
  /** ECHO typename to extract (drives the structured-output schema). */
  readonly type: string;
  /** How to find an existing instance for merge (resolver key). undefined ⇒ always create. */
  readonly identity?: IdentitySpec;
  /** Parent target type for containment via Obj.setParent (e.g. Segment → Trip). */
  readonly parent?: string;
  /** Relations to create from the source to this target (e.g. Message → Trip). */
  readonly relations?: ReadonlyArray<RelationSpec>;
}
```

### 6.2 Runtime (two phases)

**Phase A — LLM (pure extraction, no DB).**
1. Extract the source text (e.g. message body + subject).
2. Build a JSON schema from the target ECHO types (`@effect/ai` schema-constrained generation,
   §4 of brainstorm — confirmed).
3. One structured-output call to the cheap model with `template.prompt` + source text.
4. Receive validated, well-formed candidate objects per target. **No DB awareness, no tools.**

**Phase B — Framework assembly (deterministic).**
1. For each candidate, `getOrCreate` via `Resolver` keyed by `TargetSpec.identity` → existing
   (merge fields → `updated`) or new (→ `created`).
2. Wire containment: `Obj.setParent(child, parent)` per `TargetSpec.parent`
   (e.g. Segment→Trip, Booking→Trip).
3. Build relations from `source` per `TargetSpec.relations` (e.g. Message→Trip).
4. Collect `template.tags`.
5. Return `ExtractResult`. (Dispatcher persists; nothing committed before `onProposal`.)

This is the trip extractor's logic, made declarative: the LLM replaces the regex bank; the
assembly mirrors `Trip.addSegment` + `Obj.setParent(booking, trip)` + the `ExtractedFrom`
relation + the `travel` tag.

### 6.3 Hybrid registration

- **Code templates**: a TS `ExtractionTemplate` literal → `makeTemplateExtractor(template)`
  → an `ObjectExtractor`, registered via the plugin's existing capability mechanism.
- **ECHO templates**: an `ExtractionTemplate` ECHO **schema** is defined so user-authored
  templates can be stored/queried/referenced (Agents/Routines later). The runtime reads either
  form into the same internal representation. Authoring UI is out of scope.

## 7. plugin-inbox bridge

`plugin-inbox` keeps the `MessageExtractor` capability **as the registration surface** (renamed
conceptually to `ObjectExtractor`; capability key updated), and:

1. Builds `ExtractorRegistry` layer from `Capability.getAll(InboxCapabilities.ObjectExtractor)`.
2. `ExtractMessage` becomes a thin wrapper over the core dispatcher: passes `source: message`,
   threads `extractorId`, and applies `result.tags` to the owning `Mailbox` afterwards
   (relocated tag logic).
3. `targetTripId` removed from `ExtractInput`, `InboxOperation`, and `gmail/sync.ts`
   call-site.

## 8. Migrations (driven by fixtures — see §9)

1. **Create `@dxos/extractor`** with interfaces + registry + dispatcher + `Resolver` +
   `getOrCreate` + template engine. Move `parseSignature` + its test + `sig.yml` fixture here
   (kept for later reuse).
2. **Move `Resolver`** (`services/resolver.ts`) to `@dxos/extractor`; re-point
   `inbox-resolver.ts`, calendar/gmail mappers, sync ops, and tests.
3. **Generalise** `MessageExtractor` → `ObjectExtractor` (`source`, `sourceTypes`); update
   `contact-extractor`, `summarize-extractor`, dispatcher, capability key, stories.
4. **Trip → template**: replace `trip-extractor.ts` regex with an `ExtractionTemplate`
   (Trip⊃Segment, Booking→Trip, Message→Trip relation, `travel` tag). Existing trip fixtures
   must pass via memoized LLM responses.
5. **Rename** `operations/google/people` → `operations/google/contacts` (dir + imports).
6. **Remove** `targetTripId` everywhere.

No compatibility shims/re-exports — every call site updated in the same change (per
CLAUDE.md).

## 9. Testing strategy — fixture-driven

The implementation plan is **driven by test fixtures** (message objects). Each migration step
is gated by fixtures-first tests.

- **Source fixtures**: raw email `.txt` files + `parseFixtureMessage` (existing pattern in
  `plugin-trip/.../testing/`), extended with calendar `Event` fixtures for the generalisation.
- **LLM determinism**: template-extractor tests use the **memoized-LLM** harness
  (`*.conversations.json`, see `regenerate-memoized-llm` skill) so structured-output calls are
  reproducible in CI. A `match`-only fast path needs no LLM.
- **Merge/assembly**: unit-test `getOrCreate` + assembly with an in-memory `EchoTestBuilder`
  and a `Resolver.Mock`, asserting create-vs-update and graph wiring — mirroring the existing
  trip extractor tests (`extract — first email creates …` / `subsequent email updates …`).
- **Regression gate**: the existing `trip-extractor.test.ts` assertions (Trip name SFO/LHR,
  Booking confirmation `ABC123`, Segment dedupe by number+date, gate-change update) are the
  acceptance bar for the template port.
- **Dispatcher**: test `onProposal` identity (passthrough), mutation, and cancel
  (`undefined` ⇒ no writes).
- **Resolver move**: existing `resolver.test.ts` / mapper tests pass unchanged after re-pointing
  imports.

Run: `moon run extractor:test`, `moon run plugin-trip:test`, `moon run plugin-inbox:test`.

## 10. Risks / open items

- **Structured-output against ECHO types**: confirm `@dxos/ai` + `@effect/ai` can derive a
  JSON schema from an ECHO `Type` for `generateObject`-style calls; if not, add a thin
  `Type → JSON schema` helper in `@dxos/extractor`. (Validate in step 1.)
- **Load-order/cycles**: `@dxos/echo` ↔ `@dxos/types` cycle already forced schema-construction
  to be split out in `InboxOperation.ts`; replicate that discipline in `@dxos/extractor`.
- **Confidence/precedence**: domain templates must still outrank `summarize` (0.2) and
  `contact` (0.1) — preserve the confidence convention.
- **Multi-segment itineraries**: current trip extractor is single-segment-per-email by design;
  the template can request *all* segments, but step 4 keeps parity first, then optionally
  extends (guarded by a new fixture).

## 11. Out-of-scope follow-ups

- Preview/edit/cancel Dialog wired to `onProposal`.
- `ExtractionTemplate` authoring UI.
- Agent/Routine references to templates.
- Agentic (tool-calling) extraction path.
