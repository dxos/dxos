# Topics UX v2 — Design

_Date: 2026-07-12 · Project: mailbox-research · Branch: claude/mailbox-research-de25b8_

## Context

The first Topics pass (PR-level work already landed) tags messages, clusters their threads, and
materializes `Topic` objects anchored to the mailbox. In live review the quality was low: most mail is
no-action **bulk** (receipts, logins, order confirmations), and topics were created for senders the
user has no relationship with. Two quality fixes already shipped:

- **`bulk` tagging** — `pipeline-email/stages/tag.ts` `classifyBulk` + `applyBulkTag`; invoices /
  payment-requests classify as `action` and are never bulk.
- **Person-gated materialization** — `runTopicsPipeline` `keepTopic` predicate; `analyze-topics`
  only materializes topics whose participants include a known `Person`.

This spec covers the remaining three, design-heavy improvements, built as one phased stream in the
order **#7 → #5 → #6**. Each phase ships independently.

## Goals

- **View** a topic in depth (master/detail), not just a card in a list.
- **Curate** topics: `AnalyzeTopics` proposes lightweight suggestions; the user accepts/dismisses.
  Bulk-dominated clusters are suppressed; person-linked clusters are surfaced first.
- **Create** a topic on demand from a single message.

## Non-goals (v1)

- Cross-thread "find related" for message→topic (single thread only; deferred).
- Semantic/embedding-based clustering (the deterministic clusterer stays).
- Full trigger/cursor incremental pipeline (one-shot + resumable-lite stays).
- Editing a topic's membership by hand.

## Shared model change

Extract `Topic`'s inner struct so the same field shape backs both a persisted object and an inline
suggestion (the user's "reuse current schema inline"):

```ts
// packages/core/compute/pipeline-email/src/types/Topic.ts
export const TopicProps = Schema.Struct({
  label: Schema.String,
  summary: Schema.String,
  threadIds: Schema.Array(Schema.String),
  participants: Schema.Array(Schema.String),
  keywords: Schema.Array(Schema.String),
  questions: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.String),
});

export class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.topic', '0.1.0'))(TopicProps) {}
```

`Mailbox` (plugin-inbox) gains:

```ts
// A proposed topic the user has not yet accepted. Same field shape as a Topic so promotion is
// Obj.make(Topic, suggestion) with no mapping.
topicSuggestions: Schema.optional(Schema.Array(TopicProps)),
```

Promotion: `Obj.make(Topic, suggestion)` + `AnchoredTo(Topic → Mailbox)`, then drop the entry from
`topicSuggestions`. Dismissal: drop the entry.

## Phase A — `TopicArticle` master/detail (#7)

**Detail container.** New `TopicArticle` (peer of `MessageArticle`) rendering one `Topic`:

> **Shipped scope (v1) vs deferred.** v1 renders the topic's stored fields (`label`, `summary`, keyword
> chips, participants, rolled-up `questions`/`tasks`) and lists the thread ids; master→detail opens via
> `useShowItem` (companion). **Deferred (TASKS follow-ups):** resolving `threadIds` to live feed messages,
> thread click-through, and the multi-mode deck-peer path. The bullets below describe the full target.

- Header: `label`; body: `summary`, keyword chips, participants, rolled-up `questions` / `tasks`.
- Member threads: `threadIds` are string keys, not refs. Resolve to messages by querying the mailbox
  feed and grouping by `threadId` (reuse the mailbox's existing aggregate/threading). Render the
  thread list (subject + participant/message count); clicking a thread selects it in the mailbox
  (the same `LayoutOperation.Select` / `Open` path messages already use). _[deferred — v1 lists thread ids]_

**Master → detail.** `TopicsArticle` selection opens `TopicArticle` via `useShowItem` (companion in v1).
The full target follows the **same `layout.mode` branching MailboxArticle uses** for messages: `simple` →
companion (`UpdateComplementary`), `multi` → deck peer (`Open`) _[deferred]_, else → companion (`UpdateCompanion`).

**Surface + graph.** New react-surface `AppSurface.object(Article, Topic)` → `TopicArticle`. Topic
nodes are reachable via selection from the Topics list; no new app-graph node required in v1.

**Testing.** Storybook play test: seed a `Topic` + its member `Message`s, render `TopicArticle`,
assert the summary, keyword chips, thread list, and question/task counts appear; click a thread and
assert the selection action fires.

## Phase B — topic suggestions (#5)

**Generation.** `AnalyzeTopics` writes clusters to `Mailbox.topicSuggestions` instead of persisting
`Topic` objects. For each cluster compute two signals:

- `bulk` — the majority of the cluster's member messages carry the `bulk` tag (from the tag index).
  **Bulk clusters are suppressed** (strongest negative signal — they are the low-utility noise).
- `personLinked` — any participant matches a known `Person` email (the existing `keepTopic` logic,
  demoted from a hard filter to a ranking signal). Person-linked survivors sort first (and are
  badged).

Dedup by `label` against existing `Topic` objects **and** existing suggestions, so re-runs are
idempotent.

**Surface.** `TopicsArticle` gains a "Suggested" section above the accepted topics. Each suggestion
card shows label/summary/counts plus **Accept** (→ promote to `Topic` + `AnchoredTo`, drop entry) and
**Dismiss** (→ drop entry). Person-linked suggestions are badged/ordered first.

**Pipeline shape.** `runTopicsPipeline` returns suggestion drafts (it already produces `TopicDraft`s);
the operation classifies bulk/person per draft, filters bulk, orders, and writes the survivors to
`topicSuggestions`. The pure classification/ordering is unit-tested; the persistence is thin.

**Testing.** Unit test: bulk-dominated cluster suppressed; person-linked ordered first; dedup vs
existing. Storybook play test: seed suggestions on the mailbox, Accept one (assert a `Topic` appears
and the suggestion is gone), Dismiss another (assert it's gone with no `Topic`).

## Phase C — Create Topic from message (#6)

**Entry point.** A Message context-menu "Create Topic" item, gated via an `enable…` prop on the
message tile (mirroring the ignore-sender gating fix) and handled in the mailbox surface.

**Operation.** New `CreateTopicFromMessage(message)`:

1. Build the message's thread (`buildThreads` over its thread members).
2. Seed a single `Topic` from that one thread (label from subject/keywords; LLM `summary`).
3. Run fact extraction on the thread's messages (reuse the existing fact pipeline). _[deferred — TASKS follow-up]_
4. Persist `Topic` + `AnchoredTo`, then open `TopicArticle` in the companion.

v1 is single-thread and does **not** run fact extraction (step 3 deferred); cross-thread "find related"
is also deferred.

**Testing.** Storybook play test with a mock `AiService`: invoke the menu action on a seeded message,
assert a `Topic` is created and `TopicArticle` opens.

## Risks / open questions

- **Thread→message resolution** relies on `threadId` string keys matching feed messages; if a topic
  references threads no longer in the feed, the detail list shows fewer threads than the count. Show
  the stored count and render whatever resolves.
- **Suggestion churn**: writing suggestions on every `AnalyzeTopics` run must dedup against both
  accepted topics and prior suggestions or the list grows unboundedly.
- **`AnchoredTo` orphan on delete** (pre-existing follow-up): deleting a `Topic` currently leaves its
  relation; fold the relation cleanup into the delete path when Phase A touches it.

## Rollout

Phases land as separate commits on the branch, each build/lint/fmt clean with its storybook play test
green. The implementation plan (per-phase task breakdown) lives in
`packages/stories/stories-brain/TASKS.md` under "Topics UX v2" — no separate plan file.
