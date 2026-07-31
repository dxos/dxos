# Thread ⨉ Channel Merge — Design

> REQUIRED SUB-SKILL for implementation: superpowers:subagent-driven-development.
> Design ref: `packages/plugins/plugin-transcription/AUDIT.md` (issue #7).
> Scope is LARGE→HUGE — recommend a **dedicated branch/PR**, not the calls/meeting PR.

## Problem

`Thread` and `Channel` (both in `@dxos/types`) overlap conceptually ("an ordered conversation of
messages") but are modelled differently, forcing every consumer to pick one and giving us two article
components, two append paths, and two mental models.

|              | `Thread` (`org.dxos.type.thread@0.2.0`)   | `Channel` (`org.dxos.type.channel@0.2.0`)                   |
| ------------ | ----------------------------------------- | ----------------------------------------------------------- |
| Messages     | `messages: Ref<Message>[]` (local ECHO)   | resolved via `backend` provider (Feed queue, ATProto, …)    |
| Append       | push a `Ref` onto the array               | `provider.send()` via `ChannelBackendProvider`              |
| Extra fields | `status?`, `agent?: AgentConfig`          | `backend: { kind, config: Ref }`                            |
| Anchoring    | `AnchoredTo` relations (comments on docs) | standalone, first-class                                     |
| Read-only    | no                                        | yes, when backend is foreign-keyed                          |
| Consumers    | plugin-comments (heavy), plugin-thread    | plugin-thread, plugin-meeting, plugin-calls, plugin-bluesky |

Counts: ~32 files import `Thread`, ~35 import `Channel` (heavy overlap in plugin-thread).

Note: `Call.transport: { kind, config: Ref }` already mirrors `Channel.backend` — the pluggable-backend
pattern is the established direction in the codebase.

## Options

### Option A — Channel absorbs Thread (RECOMMENDED end-state)

`Channel` becomes the single conversation type. Add `status?` + `agent?` to it, support `AnchoredTo`,
and introduce a **`local-ref` backend** (`org.dxos.channel.backend.ref`) whose config holds the
`Ref<Message>[]` — preserving Thread's local append semantics behind the backend interface. Migrate
existing `Thread` objects → `Channel{ backend.kind: 'org.dxos.channel.backend.ref' }`. Retire the Thread DXN.

- ➕ One type; backend abstraction is the more general model; aligns with `Call.transport`.
- ➕ `useMessages` already abstracts message resolution — threads just get a new provider.
- ➖ Comment threads gain a backend indirection; plugin-comments must repoint AnchoredTo + status reads.
- ➖ Data migration for all existing Thread objects.

### Option B — Thread absorbs Channel

Give `Thread` an optional `backend`; channels become backed threads. Less natural (the `messages: Ref[]`
array is the degenerate local case) and inverts the more-general abstraction. Not recommended.

### Option C — New `Conversation` type

Supersede both with `org.dxos.type.conversation@0.1.0`; Thread/Channel become deprecated aliases with
migration. Cleanest naming, highest churn (every import changes), double migration. Recommended only if
we want the rename anyway.

### Option D — UI/abstraction merge only (low-risk first step)

Keep both DXNs. Extract a shared `Conversation` interface, a single `useMessages`, and one unified
article component so consumers stop branching on the concrete type. Defer the schema/data migration.

- ➕ Delivers most of the developer-facing value with no breaking DXN change or data migration.
- ➕ Can ship incrementally and de-risks a later Option A.
- ➖ Two schemas still exist; doesn't fully resolve AUDIT issue #7.

## Recommended path

**D first (this/next PR), then A (dedicated follow-up).** D removes the duplicate UI/hook surface
without a migration; A finishes the consolidation once the unified surface is proven. The single
product decision below picks the _end-state_ (A vs C) and whether D is an acceptable interim.

## Phased plan (Option A end-state)

1. **Unify the read/append surface (Option D).** `useConversationMessages(conversation)` + a single
   `ConversationArticle`; register a `local-ref` backend provider that reads/writes `Ref<Message>[]`.
   `ThreadArticle`/`ChannelArticle` become thin wrappers. No schema change yet.
2. **Schema convergence.** Add `status?`/`agent?` to `Channel`; allow `AnchoredTo` targeting a Channel.
3. **Migration.** Codemod existing `Thread` objects → `Channel` with the `ref` backend; migration util
   in composer-app; update story seeds.
4. **Repoint consumers.** plugin-comments AnchoredTo queries + status/agent reads → Channel;
   plugin-thread exports Channel as primary; plugin-meeting/calls already on Channel.
5. **Retire Thread.** Remove the Thread DXN/type (no compat shim per repo policy — update all call sites
   in the same change).

## Decision needed (product)

1. **End-state identity:** keep `Channel` as the surviving type (Option A) **or** introduce a new
   `Conversation` type (Option C)?
2. **Interim:** is the Option-D UI/abstraction merge an acceptable first step, or go straight to the
   schema migration?
3. **Where:** dedicated branch/PR (recommended) vs. folding into the current calls/meeting PR.

## Risks

- Breaking DXN change → data migration required for every space with threads/channels.
- plugin-comments is the heaviest Thread consumer (AnchoredTo + status + agent) — highest-risk repoint.
- plugin-bluesky backend provider interface must stay stable through the merge.
