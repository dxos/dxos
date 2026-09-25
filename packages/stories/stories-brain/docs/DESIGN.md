# Incremental pipeline processing via triggers — DESIGN

How to run a long-running pipeline (e.g. background LLM enrichment of a mailbox) as a series of
bounded, resumable increments driven by the existing **Trigger** mechanism, rather than one
long-running job. Motivating case: the two-tier mailbox latency work (`REPORT.md` §5) — sync stays
fast and deterministic in the foreground; summarize / facts / draft run in the background. This
document is the mechanism; the mailbox is the first consumer.

## 1. Problem & constraints

- **Triggered routines have a maximum run time.** A single background pass over a whole mailbox
  (hundreds/thousands of messages × seconds of LLM latency each) will exceed it and be killed.
- Therefore the work must be **incremental**: each trigger firing processes a bounded slice, persists
  progress, and yields; the next firing resumes where the last left off, until the backlog drains.
- It must be **correct under interruption** — a firing can be killed mid-way, re-run, or (mis)fire
  concurrently — without double-processing, skipping, or corrupting state.
- The **foreground stays fast**: no LLM in the sync path; all LLM cost is batchable background work.

## 2. Existing building blocks (reuse, don't reinvent)

| Piece                                                                                                     | Where                                                                         | Role                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Trigger` (`email`/`feed`/`subscription`/`timer`/`webhook`; `remote`; `concurrency`; `runnable`; `input`) | `packages/core/compute/compute/src/Trigger.ts`                                | Fires a runnable on a schedule/query/event; `remote` picks edge vs client; `concurrency` bounds parallel firings. |
| `TriggerStateStore` (`processedVersions: Record<EntityId, version>`)                                      | `packages/core/compute/functions-runtime/src/triggers/trigger-state-store.ts` | **Durable per-trigger cursor** — which objects (and at what version) are already handled.                         |
| `runFactPipeline({ feed, cursors, pageSize, concurrency })` + `FeedCursorsApi` high-water                 | `@dxos/pipeline-email`, `@dxos/pipeline-rdf`                                  | Cursored, **paged** processing over a feed — the increment engine already exists.                                 |
| `Progress` + `ProgressReporter` (EDGE/file/log sinks)                                                     | `packages/core/compute/pipeline/src/{Progress,ProgressReporter}.ts`           | Live, subscribable visibility. In-memory per process — a **view**, not the source of truth.                       |
| Triage predicates (`Mailbox.isReplyable`, `summaryKindFor`, `enrichMessage`, `resolveModel`)              | this PR (#12167)                                                              | Decide _which_ items the increment selects and _what/which model_ runs per item.                                  |

The durable-cursor and paged-processing halves already exist. What's missing is: **bounding one
firing** and **re-firing until drained**.

## 3. Core model — the increment

An increment is one firing of the background runnable. Each firing:

1. **Select** the next bounded window of pending work, past the cursor, gated by the triage
   predicates (e.g. "person mail without a summary", oldest-first).
2. **Process** the window (`enrichMessage` / `draftReply`, model via `resolveModel`), with a per-item
   timeout so one slow/poison item can't consume the whole budget.
3. **Commit** results **and** advance the cursor together, so the persisted cursor never claims more
   progress than was actually committed.
4. **Report** `{ processed, remaining, done }`.

```ts
type IncrementResult = {
  readonly processed: number; // items handled this firing
  readonly remaining: number; // backlog still pending after this firing
  readonly done: boolean; // remaining === 0
};

// Bounds — stop at whichever hits first, well under the platform max run time.
type IncrementBounds = {
  readonly maxItems: number; // e.g. 25
  readonly timeBudgetMs: number; // e.g. 0.8 × platform max run time
};
```

**The cursor is the single source of truth.** `Progress` mirrors the firing for the UI but is never
the resume point (it's in-memory, lost on crash).

## 4. Selection & the cursor

Two equivalent cursor shapes, matching the two trigger kinds:

- **Feed high-water** (`FeedCursorsApi`, monotonic feed key) — natural for the mailbox feed today;
  oldest-first, resumes past the last committed key. This is what `runFactPipeline` already uses.
- **Processed-versions set** (`TriggerState.processedVersions`) — natural for a `subscription`
  trigger over a query; handles _edits_ (re-enrich when an object's version changes), not just new
  objects.

Selection is **cursor + a predicate filter**: the triage gate (`isReplyable`, `summaryKindFor`)
decides membership, so the _fast lane_ (person mail) and _slow lane_ (org labels, backfill) are just
different queries over the same corpus.

## 5. Re-trigger strategies

1. **Timer / cron heartbeat (v1, recommended floor).** A `timer` trigger fires every interval; each
   firing drains one increment. Robust: no runaway, self-healing, natural backpressure. Cost: drain
   latency ≈ interval × ⌈backlog / maxItems⌉. Tune interval + `maxItems`.
2. **Self-chaining (accelerator).** When `remaining > 0`, the runnable re-arms the next firing — bump
   a watched "cursor"/"pending" object a `subscription` trigger fires on, or emit a continuation
   event. Drains fast; requires a **stop condition** (`remaining === 0`), `concurrency: 1`, and a
   debounce so the cursor write doesn't create a tight loop.
3. **Reactive fast lane.** A `subscription` trigger on _new replyable person mail_ enriches it
   immediately (low latency for what matters), while a timer sweeps the bulk backlog.

**Recommended target — hybrid:** a **timer** as the always-on floor (guarantees progress even if a
chain breaks) **plus** self-chaining while a deep backlog exists (low latency), plus a subscription
fast lane for person mail. The timer is the safety net; chaining is the accelerator.

> Constraint: `FeedSpec` carries a TODO to migrate to subscription triggers "once EDGE supports them
> for feed queries." Mailbox messages live in a **Feed**, so an edge background trigger over the
> mailbox is a **`feed`** trigger today; the subscription/query form on edge for feeds is pending.
> v1 therefore uses `feed` + `timer`; the subscription fast lane lands when edge support does.

## 6. Correctness

- **Idempotency.** Re-processing an item must be safe (a killed firing reprocesses at most its last
  uncommitted window). Enforce by (a) cursor-gating and (b) a per-item processed marker
  (`processedVersions`) so overlap/replay neither double-writes nor skips.
- **Concurrency.** `concurrency: 1` per cursor so two firings can't race the same window; shard by a
  stable key (e.g. thread) if parallelism is needed later.
- **Crash recovery.** Persist the cursor only for the **committed** window; a crash costs at most one
  re-processed increment.
- **Poison / slow items.** Per-item timeout + error isolation (degrade to skip or mark-failed, record
  it, advance) — mirrors `generateText`'s `catchAllCause` degrade and the fact pipeline's
  per-message timeout. One bad item never stalls the lane.
- **Ordering.** Oldest-first by cursor key (matches the fact pipeline's high-water semantics; a
  newest-first feed would strand everything older than the first processed key).

## 7. Bounding a firing

Stop when **either** `maxItems` **or** `timeBudgetMs` is reached, then persist + report `remaining`.
`timeBudgetMs` should be ~80% of the platform max run time so commit + cursor-write always finish
inside the window. Optionally **adaptive**: shrink `maxItems` when p50 item latency is high (reasoning
models), grow it when items are fast — keeps each firing safely inside the budget without hand-tuning.

## 8. Two-tier placement (the mailbox consumer)

- **Foreground (sync, no trigger):** fetch → dedup → decode → map → stats → threads → commit, plus
  `classify-sender` (heuristic) + `tag` — all deterministic/fast. Inbox usable immediately.
- **Background (trigger, incremental):** `enrichMessage` (tag+summary/label+facts folded into one
  call) and `draftReply` for replyable person mail; model per `resolveModel`; gated by the triage
  predicates; drained by the increment loop above.

## 9. Observability

Seed `Progress` from the cursor so the panel shows **global** backlog, not just the current firing:
`total` = pending count, `current` = drained so far; `advance()` per item; a terminal `done()`/`fail()`
per firing. Wire the **EDGE `ProgressSink`** for a live "enriching 120/300…" indicator (the deferred
"reactive Progress panel + EDGE sink" task). Truth = cursor; Progress = view.

## 10. Interfaces (sketch)

```ts
// The bounded step — pure enough to unit-test in the harness before any trigger exists.
const runIncrement = (opts: {
  feed: Feed;
  cursors: FeedCursorsApi;
  bounds: IncrementBounds;
  select: (msg) => boolean; // triage gate
  process: (msg) => Effect<void>; // enrichMessage / draftReply
  progress?: TaskHandle;
}) => Effect<IncrementResult>;

// Trigger wiring (product): a timer floor …
Trigger.make({
  runnable,
  remote: true,
  concurrency: 1,
  spec: Trigger.specTimer('*/2 * * * *'),
  input: { mailbox: '{{…}}' },
});
// … plus a self-chain / subscription fast lane once edge feed-queries land.
```

## 11. Rollout

1. **P1 — increment core (harness, testable).** `runIncrement` bounding `enrichMessage` over the feed
   via the existing cursor; unit-test bounds (maxItems/time), resume, idempotency, poison-skip. No
   trigger needed.
2. **P2 — timer trigger (product).** Wire the runnable behind a `timer` trigger (`remote: true`,
   `concurrency: 1`); cursor in `TriggerStateStore`. Ship the always-on floor.
3. **P3 — fast lane + chaining + panel.** Subscription trigger for new person mail (when edge feed
   queries land), self-chaining while backlog is deep, and the EDGE `ProgressSink` panel.

## 12. Open questions

- Exact platform max run time (edge vs client) → sets `timeBudgetMs`.
- Cursor granularity for **re-enrichment** on edits (version bump) vs new-only — `processedVersions`
  supports it; do we need it in v1?
- Priority within a lane (recency? sender importance? unread?) — ordering beyond oldest-first.
- Where the runnable/operation lives (plugin-inbox operation vs a generic `@dxos/pipeline` increment
  wrapper reused across pipelines).
