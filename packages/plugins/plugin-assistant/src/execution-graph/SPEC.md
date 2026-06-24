# Trace Execution Graph — Specification

This document specifies the pure-data layer that powers the `TracePanel` Timeline view.
Source: `packages/plugins/plugin-assistant/src/execution-graph/`.

## 1. Purpose & scope

The module converts a flat list of `Trace.Message` records (and a snapshot of active
processes) into a Mercurial/Git-style commit graph consumable by the
`@dxos/react-ui-components` `Timeline` component.

In scope:

- Hierarchical grouping of trace events into spans (`buildSpanTree`).
- Translation of the span tree into commits + branches with explicit parent edges
  (`buildExecutionGraph` → `spanTreeToCommits`).
- A commit-query DSL (`CommitSelector`) used internally for parent computation.
- A `details` map exposing the underlying `Trace.FlatEvent` for each commit
  (used by the inspector / Syntax pane).

Out of scope:

- React rendering, styling, layout.
- Trace transport, persistence, or feed queries (the panel reads these via ECHO atoms).
- Filtering / search of commits.
- Mutating, ack-ing, or replaying trace events.

Inputs: `traceMessages: Trace.Message[]`, `activeProcesses?: Process.Info[]`, `eventLimit?: number`.
Output: `ExecutionGraph = { branches, commits, spanTree, details }`.

## 2. Inputs

### 2.1 `Trace.Message`

Defined in `packages/core/compute/compute/src/Trace.ts#L154`.
A `Message` is `{ meta: Meta, isEphemeral: boolean, events: Event[] }`. The builder
flattens via `Trace.flatten` (`Trace.ts#L178`) so every event inherits its message's
`meta` — there is no per-event meta override.

`Meta` fields (`Trace.ts#L102`):

| Field            | Read by the builder                      | Purpose                                                                      |
| ---------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `pid`            | Yes                                      | Identifies the span the event belongs to and the branch the commit lives on. |
| `parentPid`      | Yes                                      | Links a span to its parent span at begin time.                               |
| `processName`    | No (carried in `SpanMeta` for consumers) | —                                                                            |
| `space`          | No                                       | —                                                                            |
| `conversationId` | No (carried in `SpanMeta`)               | —                                                                            |
| `triggerId`      | No (carried in `SpanMeta`)               | —                                                                            |
| `toolCallId`     | No (carried in `SpanMeta`)               | —                                                                            |
| `runtimeName`    | No (carried in `SpanMeta`)               | —                                                                            |

Only `pid` and `parentPid` participate in graph topology. The remaining fields are
forwarded as `SpanMeta` for downstream display but never branch or anchor logic.

`isEphemeral` is preserved on `FlatEvent` but is not consulted; ephemeral events
participate exactly like persistent events.

### 2.2 `Process.Info` (active processes)

Defined in `packages/core/compute/compute/src/Process.ts#L365`.
Optional input via `activeProcesses` (defaults to `[]`). Fields the builder reads:

- `pid` — used both as a commit-id suffix and as the branch name for the spinner.
- `key` — compared against `AGENT_PROCESS_KEY` (`'org.dxos.testing.process.agent'`,
  `packages/core/compute/functions-runtime/src/agent-service/agent-process.ts#L54`).
- `state` — gated on `Process.State.RUNNING` and `Process.State.HYBERNATING`
  (spelling matches the runtime; `Process.ts#L321`).
- `params.target` — non-null required for the agent special case.

`parentPid`, `error`, `startedAt`, `completedAt`, `metrics` are ignored.

### 2.3 Configuration

- `buildExecutionGraph` defaults `eventLimit = 500`
  (`execution-graph.ts#L94`).
- `TracePanel`'s `getExecutionGraph` defaults `eventLimit = 300`
  (`TracePanel.tsx#L153`).
- The cap targets `Timeline` rendering cost, not memory; see §11 for what it bounds.

## 3. Outputs

### 3.1 `ExecutionGraph`

```ts
export type ExecutionGraph = {
  branches: string[];
  commits: Commit[];
  spanTree: Span;
  details: ExecutionGraphDetailsMap;
};
export type ExecutionGraphDetailsMap = Record<string, Trace.FlatEvent | undefined>;
```

- `branches` — every branch name a commit was placed on; `'main'` is always present
  (the builder seeds it). Order is insertion order from the underlying `Set`.
- `commits` — flat list, may be unordered (consumers should not rely on order; the
  `Timeline` sorts by parent topology). Deduped by id.
- `spanTree` — the hierarchical intermediate representation; exposed for debug views.
- `details` — commit id → originating `Trace.FlatEvent`. Used by `TracePanel` to
  render the Syntax pane when a commit is selected (`TracePanel.tsx#L118`). Only
  commits that were emitted via `presentEvent` appear here.

### 3.2 `Commit` (set fields only)

From `packages/ui/react-ui-components/src/components/Timeline/Timeline.tsx#L40`. The
builder sets:

- `id` — see §9.
- `branch` — pid-derived (see §6).
- `parents` — see §8.
- `timestamp` — `new Date(event.timestamp)` (events) or `new Date()` (spinners).
- `icon`, `level`, `message` — from `presentEvent`.

The builder does not set `tags` or `link`. `CommitSelector.tag` / `.anyTags` exist
for consumers that add their own tags downstream.

## 4. Event classification

Two type sets defined in `span-tree.ts#L47`:

```ts
export const BEGIN_EVENT_TYPES = new Set([Trace.OperationStart.key, AgentRequestBegin.key]);
export const END_EVENT_TYPES = new Set([Trace.OperationEnd.key, AgentRequestEnd.key]);
```

- **Begin events**: `operation.start`, `assistant.agentRequestBegin`. Open a span.
- **End events**: `operation.end`, `assistant.agentRequestEnd`. Close a span.
- **Middle events**: every other event type carried by a `meta.pid`. Attached to the
  currently-open span for that pid.
- **Pid-less events**: any event whose `meta.pid` is `undefined`. Attached to the
  synthetic root span.

### 4.1 Which events produce commits (`presentEvent`)

`execution-graph.ts#L118`. Each branch validates `event.data` against the
event-type schema; on validation failure the event is silently dropped (log only).

| Event type                     | Condition               | Icon                    | Level     | Message                         | `idSuffix`          |
| ------------------------------ | ----------------------- | ----------------------- | --------- | ------------------------------- | ------------------- |
| `AgentRequestBegin`            | —                       | `ph--atom--regular`     | `VERBOSE` | `"Agent processing request..."` | —                   |
| `AgentRequestEnd`              | —                       | `ph--atom--regular`     | `INFO`    | `"Agent completed request"`     | —                   |
| `CompleteBlock` text           | `role === 'user'`       | `ph--user--regular`     | `VERBOSE` | trimmed `block.text`            | —                   |
| `CompleteBlock` text           | `role !== 'user'`       | — (drop)                | —         | —                               | —                   |
| `CompleteBlock` status         | —                       | `ph--info--regular`     | `VERBOSE` | trimmed `block.statusText`      | —                   |
| `CompleteBlock` other          | —                       | — (drop)                | —         | —                               | —                   |
| `Trace.OperationStart`         | —                       | `ph--function--regular` | `VERBOSE` | `data.name ?? data.key`         | `${data.key}:start` |
| `Trace.OperationEnd` (success) | `outcome === 'success'` | `ph--function--regular` | `INFO`    | `${name ?? key} - Success`      | `${data.key}:end`   |
| `Trace.OperationEnd` (failure) | `outcome !== 'success'` | `ph--function--regular` | `ERROR`   | `${name ?? key} - Error`        | `${data.key}:end`   |
| anything else                  | —                       | — (drop)                | —         | —                               | —                   |

`trimText` clips to first 100 chars, trims whitespace, drops everything after the
first newline (`execution-graph.ts#L438`).

Dropped events (non-`presentEvent` types or filtered roles) never appear in
`commits` or `details`, but they remain in `spanTree.events`.

## 5. Span tree construction (`buildSpanTree`)

`span-tree.ts#L112`. Algorithm:

1. **Flatten** every message: `messages.flatMap(Trace.flatten)`. Each output is a
   `FlatEvent` carrying the message's `meta` and `isEphemeral`.
2. **Sort** the flat stream chronologically by `event.timestamp` ascending. The
   sort is in-place and uses subtraction (no NaN guard); identical timestamps
   keep their relative order as `Array.prototype.sort` is stable in modern V8.
3. **Apply `eventLimit`** (see §5.2). Boundary events are immune.
4. **Linear scan** the (possibly trimmed) stream:
   - Pid-less event → push onto root.
   - Begin event with pid `P`, parentPid `Q`:
     - Parent span = `openSpans.get(Q)` if `Q` is defined and open, else root.
     - Allocate a fresh id `${P}#${spanCounter++}` and create the span.
     - Push the begin event as the span's first event.
     - **`openSpans.set(P, newSpan)`** — supersedes any previously open span for
       this pid.
   - End event with pid `P`:
     - If a span is open for `P`: push the end event onto it and `openSpans.delete(P)`.
     - Else: push the end event onto root (orphan end).
   - Other event with pid `P`:
     - If a span is open for `P`: push onto it.
     - Else: push onto root.
5. **Sort children** of every span by `firstTimestamp` ascending (depth-first).
   Determinism guarantee.

The `MutableSpan.firstTimestamp` is updated on every push via `noteTimestamp`
(`Math.min` against the current value, init `+Infinity`). Used only for sibling
ordering.

Spans are frozen via `freezeSpan` into the public `Span` shape; the
`firstTimestamp` field is internal and not exposed.

### 5.1 Same-pid sequential spans

Multiple complete begin/end pairs sharing a `pid` become **sibling spans under the
same parent**. The second begin orphans the first because `openSpans.set(pid, …)`
unconditionally supersedes. This is intended for _sequential_ execution within
one process (e.g. successive agent requests in a session) — not interleaved.
Each sibling receives a distinct synthetic id (`${pid}#${n}`); the shared `pid`
is preserved in `SpanMeta` and used for branch derivation (§6) so siblings share
a lane.

Test reference: `span-tree.test.ts#L80` ('sequential agent requests in one process
become sibling spans').

### 5.2 `eventLimit` semantics

`applyEventLimit` (`span-tree.ts#L211`) — runs _after_ chronological sort, _before_
tree construction.

Rule: only **non-boundary** events count toward `eventLimit`. Span boundaries
(`OperationStart` / `OperationEnd` / `AgentRequestBegin` / `AgentRequestEnd`) are
**always retained** regardless of the cap.

Why: dropping a begin event detaches every descendant whose `parentPid` lookup
fails — those children would fall back to root and re-render as top-level spans.
Dropping an end leaves a span open and corrupts the open-span map for any later
same-pid sibling. The motivating regression is documented in `remote-snapshot.test.ts`
(commit `eae07dad83`, "enhance event limit handling").

When the non-boundary count exceeds `eventLimit`, the _oldest_ non-boundary events
are dropped while preserving chronological order. Test reference:
`span-tree.test.ts#L134` ('eventLimit drops oldest non-boundary events but always
retains span boundaries') and `#L159` (regression for parent-child preservation).

### 5.3 Children ordering

Sibling spans are sorted by `firstTimestamp` ascending so output is deterministic
across runs that share inputs. Test: `span-tree.test.ts#L120`.

## 6. Span branch assignment (`branchOf`)

`execution-graph.ts#L263`. Pure function on a span:

1. `span === null` or `span.id === ROOT_SPAN_ID` → `MAIN_BRANCH = 'main'`.
2. Else → `span.meta.pid ?? span.id`.

Consequence: sequential same-pid sibling spans share a branch (their `meta.pid`
matches). Spans whose meta lacks a `pid` (synthetic / unusual cases) fall back to
the synthetic span id — guaranteeing a non-empty branch name.

The synthetic root id is `ROOT_SPAN_ID = '<main>'` (`span-tree.ts#L12`).

## 7. Collapsibility (`isCollapsibleSpan`)

`execution-graph.ts#L206`. A span is collapsible iff **all** of:

1. `span.id !== ROOT_SPAN_ID`.
2. `span.events.length === 2`.
3. `span.children.length === 0`.
4. `events[0]` is a begin event (`isSpanBeginEvent`).
5. `events[events.length-1]` is an end event (`isSpanEndEvent`).
6. `parent !== null` (i.e. the span has a parent in the tree).

Implication: a span whose end event hasn't arrived yet (pending) **never**
collapses, because its trailing event is a middle event, not an end. This matters
because the trailing middle event would otherwise be promoted to the parent
branch as a fake "end" commit — corrupting the visual. See test
`execution-graph.test.ts#L296` ('pending span with user message → user lands on
own branch, not parent').

Top-level spans (parent === root) **are** eligible — guard #6 only forbids
parent-less spans. A top-level operation with no inner events collapses to a
single end commit on `main` (test `execution-graph.test.ts#L194`).

## 8. Commit anchoring rules (`spanTreeToCommits`)

`execution-graph.ts#L239`. Walks the entire tree once via `walkSpanTree`, flattens
into a single chronological stream (sorted by `timestamp`, ties broken by
`globalIndex` = insertion order), then emits commits in that order. Each
emission depends on the event's role and the host span's collapsibility:

### 8.1 Root-level events (pid-less or orphans)

```
branch  = 'main'
parents = lastInSpanContext(null)   // i.e. tail of main
```

### 8.2 Collapsible span — begin event

Skipped entirely. Only the end commit is emitted.

### 8.3 Collapsible span — end event

```
branch  = parentBranch
parents = lastInSpanContext(parentSpan)
```

Anchors to the parent's structural context (own-branch tail → parent's begin →
recurse). Critically, it does _not_ anchor to the immediate parent-branch tail,
because that tail could be a sibling span's commit; structural anchoring keeps
the fork visually attached to the correct span identity.

### 8.4 Non-collapsible begin event

```
isProcessBoundary = span.meta.pid != null
                 && parentSpan.meta.pid != null
                 && span.meta.pid !== parentSpan.meta.pid
branch  = isProcessBoundary ? ownBranch : parentBranch
parents = lastInSpanContext(parentSpan)
```

For a nested sub-span within the same process (or a span with no pid of its own),
the begin commit lives on the **parent** branch — the fork only becomes visible at
the span's first middle commit. For a **child process** (its own pid, differing
from the parent's — e.g. a delegated sub-agent), the begin commit instead forks
onto the span's **own** branch immediately, so a concurrent process gets its own
lane from its first event rather than sharing the parent's lane until its first
middle commit (which otherwise made the lane "snap" across as events streamed in).
Test: `execution-graph.test.ts` → "child process (sub-agent) forks onto its own branch…".

After emission: `beginCommitIdBySpan.set(span.id, commitId)` so any future
`lastInSpanContext(span)` call can fall back to this commit.

### 8.5 Non-collapsible end event — two parents

```
branch  = parentBranch
parents = unionAll(
  last commit on parentBranch,      // chronological continuity on parent
  last commit on ownBranch,         // merge sub-flow back in
)
```

Parent #1 is the **immediate predecessor on the parent branch**, not the matching
begin commit. Pointing back to the begin would draw an edge that skips over any
sibling spans' commits emitted between begin and end (e.g. two top-level Routine
spans overlapping on `main`: R1.end would otherwise arrow back to R1.begin
crossing over R2.begin). Anchoring to the previous parent-branch commit keeps
main linear. Regression: commit `ff8db16d9c`, test
`remote-snapshot.test.ts#L49`.

### 8.6 Middle event

```
branch  = ownBranch
parents = lastInSpanContext(span)
```

The first middle event of a span thereby forks from its own begin commit
(via `lastInSpanContext` fallback #2) rather than from a sibling's commit on
some shared ancestor.

### 8.7 `lastInSpanContext(span)` helper

`execution-graph.ts#L282`. Structural (pid-keyed) walk, _not_ topological:

```ts
lastInSpanContext(null) = branch('main').compose(last());
lastInSpanContext(span) = firstOf(
  branch(branchOf(span)).compose(last()), // (a) own-branch tail
  beginCommitIdBySpan.get(span.id), // (b) span's own begin commit
  lastInSpanContext(parent(span)), // (c) recurse to parent
);
```

Why structural and not topological: if a sub-span of agent A fires before A has
emitted any middle commits, walking the parent's shared branch topologically
could land on a commit belonging to an unrelated sibling B (a different top-level
span sharing `main`). Structural anchoring guarantees the fork edge attaches to
A's identity (`A.begin`) regardless of B's interleaving. Commit `ff8db16d9c`.

## 9. Commit id format (`formatCommitId`)

`execution-graph.ts#L433`:

```
${span.id}:${globalIndex}             // base
${span.id}:${globalIndex}:${suffix}   // when EventPresentation.idSuffix is set
```

`globalIndex` is the index of the event in the post-sort flat stream — unique by
construction. `idSuffix` comes from `presentEvent`:

- `OperationStart` → `${data.key}:start`
- `OperationEnd` → `${data.key}:end`
- everything else → none

The suffix exists so a span hosting multiple sub-operations sharing the same
parent span id but different operation keys still produces distinct commit ids,
which the `Timeline` requires.

## 10. Active-process "running" indicators

After commit emission, `spanTreeToCommits` appends spinner commits for each
process in `activeProcesses` (`execution-graph.ts#L397`):

### 10.1 Agent special case

When **all** of:

- `process.key === AGENT_PROCESS_KEY` (`'org.dxos.testing.process.agent'`),
- `process.params.annotations` carries a `Process.TargetAnnotation` value,
- `process.state ∈ { RUNNING, HYBERNATING }`,

emit:

```ts
{
  id: `running:${process.pid}`,
  branch: process.pid,
  parents: last commit on branch(process.pid),
  icon: 'ph--spinner-gap--regular',
  level: VERBOSE,
  message: 'Generating...',
  timestamp: new Date(),
}
```

The branch is added by `addCommit` if it didn't already exist. This is the only
case where a spinner can introduce a new branch from thin air — the agent
process's pid always identifies a known conversational lane.

### 10.2 Generic running process

For any other process with `state === RUNNING` **and** `builder.hasBranch(process.pid)`,
emit the same shape with `message: 'Running...'`.

The branch-exists guard prevents fabricating empty branches for processes that
have not emitted any trace events yet. (The agent case bypasses this guard
because the agent's branch is its conversation lane, which we want surfaced
even when no events have arrived.)

`HYBERNATING` (note the runtime spelling) qualifies for the agent spinner but
not for the generic one — the generic case demands strictly `RUNNING`.

## 11. Graph hygiene (`GraphBuilder.doctor`)

`execution-graph.ts#L610`. Run once at `build()`:

1. **Dedupe commits by `id`** via `Array.dedupeWith`. The first occurrence wins;
   subsequent commits with the same id are dropped. `addCommit` is purely
   append-only, so dedupe is the safety net when an event slips past the unique
   `globalIndex` guarantee (e.g. spinner ids reused if two snapshots collide on
   the same pid — not currently possible but cheap to guard).
2. **Drop dangling parents** — for each surviving commit, filter `parents` to
   ids that exist in the deduped commit set.

This matters when `eventLimit` trimming leaves an end commit whose own-branch
tail (the merge parent) was dropped — without doctor, the timeline component
would receive a parent id that doesn't resolve. Also defensive against partial
fixtures used in tests / Storybook stories.

`addBranch` is invoked by `addCommit` (`#L592`), so a branch is only present in
`branches` if at least one commit was written to it. `addBranch` is also called
explicitly for `MAIN_BRANCH` at the very start so `branches` always contains
`'main'`.

## 12. `CommitSelector` DSL

`execution-graph.ts#L442`. A `CommitSelector` is a pipeable wrapper around
`(commits: Commit[]) => Commit[]`. All selectors are pure and never mutate the
input.

| Combinator              | Semantics                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `make(fn)`              | Wrap an arbitrary selector function; sets up `.pipe`.                                             |
| `identity()`            | Returns the input array unchanged.                                                                |
| `filter(pred)`          | Keeps commits where `pred(commit)` is truthy.                                                     |
| `id(id)`                | `filter(c => c.id === id)`.                                                                       |
| `tag(t)`                | `filter(c => t && c.tags?.includes(t))`. Falsy `t` (`undefined` / `null` / `false`) yields empty. |
| `anyTags(ts)`           | `filter(c => ts.some(t => t && c.tags?.includes(t)))`.                                            |
| `branch(b)`             | `filter(c => b && c.branch === b)`. Falsy `b` yields empty (same foot-gun as `tag`).              |
| `compose(next)`         | Pipe: `next(prev(commits))`. Used as `prev.pipe(compose(next))`.                                  |
| `orElse(next)`          | If `prev` is non-empty return `prev`, else `next`. Equivalent to `firstOf(prev, next)`.           |
| `andAlso(next)`         | Alias for `unionAll(prev, next)`.                                                                 |
| `first(n=1)`            | `commits.slice(0, n)`.                                                                            |
| `last(n=1)`             | `commits.toReversed().slice(0, n)` — **note reversed order**.                                     |
| `not(sel)`              | `commits.filter(c => !sel(commits).includes(c))`.                                                 |
| `unionAll(...sels)`     | Concat results, dedupe by `id`.                                                                   |
| `intersectAll(...sels)` | First selector's hits that also appear in every other selector's hits (by id).                    |
| `firstOf(...sels)`      | First selector that returns a non-empty result; else empty.                                       |

Foot-guns:

- `last(n)` returns commits in **reverse chronological order** (most recent first).
  Callers wanting the "single most recent commit on branch X" use
  `branch(X).pipe(compose(last()))` and the array's first element. Internally
  `computeParents` only consumes the ids and dedupes (`#L599`), so reverse-order
  is invisible there.
- `tag` / `branch` accept falsy inputs intentionally (the union type is
  `string | Falsy`) so `tag(maybeUndefined)` is a no-op rather than a type error.
- All selectors are immutable; `identity().select(input)` does not mutate
  `input` (`execution-graph.test.ts#L56`).

## 13. Edge cases (exhaustive)

Each entry: **scenario → expected output → rationale**.

1. **Empty `traceMessages`**
   - Tree: root span with no events, no children.
   - `commits = []`, `branches = ['main']`.
   - Why: `MAIN_BRANCH` is seeded by `addBranch` (`execution-graph.ts#L245`)
     even when no commits exist. Test: `execution-graph.test.ts#L188`.

2. **Orphan end event** (end with no matching begin)
   - Attached to root in `spanTree`; produces a single root-level commit on
     `main`. Test: `span-tree.test.ts#L114`.

3. **Orphan middle event** (no open span for pid)
   - Attached to root; commit emitted on `main` (if `presentEvent` returns
     non-undefined). Test: `span-tree.test.ts#L107`.

4. **Two top-level spans overlapping in time, different pids**
   - Two distinct branches off `main`; `main` stays linear; each end commit
     merges its own-branch tail without skip-back edges across the sibling's
     begin. Regression: commit `ff8db16d9c`, test `remote-snapshot.test.ts#L49`.

5. **Two top-level spans sequential, same pid**
   - Sibling spans under root sharing the same branch (`branchOf` returns the
     shared `pid`). The second begin's parent commit is the tail of that shared
     branch — i.e. the first end commit on `main` plus the own-branch tail
     (which is the first end on the same lane). Test:
     `span-tree.test.ts#L80`; visual contract in
     `trace-timeline.node.test.ts#L51` ('create objects via AgentService').

6. **Multiple sequential agent requests on one pid; sub-ops in the second session**
   - Sub-op commits in the second session chain off the first session's
     own-branch tail (because `branchOf` returns the shared pid). Visual
     contract: `trace-timeline.node.test.ts#L122` ('sequential prompts in a
     session') — note all three sessions share the `agent-1` branch lane.

7. **Parent begin dropped by `eventLimit` (pre-fix)**
   - Before commit `eae07dad83`: the parent's begin event was sliced away when
     verbose noise pushed it past the window. All descendants then re-parented
     to root and rendered as top-level collapsed end commits on `main`.
   - After the fix: boundaries are immune; the parent stays open and children
     remain nested. Regression: `remote-snapshot.test.ts#L27`.

8. **Sub-op fires before parent has any middle commits**
   - Sub-op's begin event anchors to its parent's `lastInSpanContext`. Lookup
     order: parent's own-branch tail (absent) → parent's `beginCommitIdBySpan`
     (present, this wins) → recurse to grandparent.
   - Net effect: fork edge attaches to parent's begin commit.

9. **Sub-op fires after a sibling top-level span begins**
   - Sub-op of A still anchors structurally to A (via `lastInSpanContext`),
     not to whatever B-belonging commit happens to be the topological tail on
     the shared ancestor branch. Commit `ff8db16d9c`.

10. **Collapsible span at root**
    - `isCollapsibleSpan` returns `true` for top-level completed spans (parent
      is root, not null). The span collapses to a single end commit on `main`.
      Test: `execution-graph.test.ts#L194` ('top-level operation with no inner
      events → collapsed to single end commit on main').

11. **Active process emits no trace events but appears in `activeProcesses`**
    - Not the agent special case → no spinner (the branch doesn't exist, so the
      `hasBranch` guard rejects). The process is invisible to the timeline.
    - Is the agent special case → spinner appears on a brand-new branch named
      after the pid.

12. **Identical timestamps on multiple events**
    - Tie-break by `globalIndex` (insertion order before sort). Two layers:
      `buildSpanTree` sorts the entire flat stream by `timestamp` only (stable
      sort preserves insertion order); `spanTreeToCommits` sorts its event
      stream by `timestamp` with explicit `globalIndex` tie-break
      (`execution-graph.ts#L309`).
    - Determinism is therefore guaranteed when input order is deterministic.

13. **`Trace.flatten` meta inheritance**
    - Every `FlatEvent` carries its message's `meta` verbatim. There is no
      per-event override mechanism. Events that need different meta must be
      emitted as separate `Trace.Message`s.

14. **Pending span (begin without end)**
    - Span is not collapsible (no trailing end event). Begin produces a fork
      commit on the parent branch; middle events produce commits on the span's
      own branch; no end commit is emitted. Test:
      `execution-graph.test.ts#L296`.

15. **`CompleteBlock` with `role !== 'user'` text block**
    - Dropped — no commit, no `details` entry. The event remains in
      `spanTree.events`.

16. **`CompleteBlock` with unhandled block `_tag`**
    - Dropped (neither `text` nor `status`).

17. **Schema-invalid event payload**
    - Logged via `log('invalid trace event', …)` and dropped. The event still
      occupies a position in `spanTree.events`.

## 14. Performance & complexity

- `buildSpanTree`: O(E log E) for the chronological sort, O(E) for the linear
  scan, O(S log S) total over child sorts (S = span count). Memory O(E).
- `spanTreeToCommits`: O(E) walk of the tree + O(E log E) sort of the flat
  stream. Commit emission is O(E) wall, but each emission's parent computation
  is O(C) where C = current commit count (the selector linearly scans all
  commits). Worst-case overall: O(E·C) — but in practice C ≪ E because most
  events are dropped middle events with no `presentEvent` mapping, and
  `lastInSpanContext` recursion depth equals tree depth D (typically ≤ 3-4).
- Expected scale: hundreds of commits, thousands of events. `eventLimit`
  exists to bound `Timeline` rendering cost (DOM nodes, layout), not memory.

## 15. Known limitations & future work

- **Pending spans + active processes**: an end-commit-less span surfaces as
  "Generating..." only for processes matching `AGENT_PROCESS_KEY`. Other
  long-running spans must wait for their begin commit to land and the
  generic `RUNNING + hasBranch` heuristic to trigger.
- **Interleaved same-pid begin/end pairs**: the data model assumes _sequential_
  spans per pid. If a process emits `B1 B2 E1 E2` interleaved, the second `B2`
  orphans the still-open `B1` (no `E1` ever closes the first span). The first
  span receives only its begin event; the second receives `B2 E1 E2`.
  Outcome: incorrect. Not currently supported.
- **Event types beyond `presentEvent`**: silently dropped from the commit
  stream but retained in `spanTree.events`. Consumers wanting the full event
  stream must read `spanTree`. Examples: `OperationInput`, `OperationOutput`,
  `StatusUpdate`, `process.spawned`, `process.exited`, `assistant.mcpServerError`.
- **`details` only stores presented events**. Selecting a commit in TracePanel
  shows that single event; there is no per-span aggregation surfaced via
  `details`.
- **Same-pid sub-spans of one process**: a process that re-uses its own pid
  for an inner operation (without supplying a distinct child pid via
  `parentPid`) cannot be distinguished from sequential top-level spans.
- **Schema validation is silent**: invalid event payloads are dropped without
  surfacing to the UI; only `log` records the drop.

## Appendix A: Source citations

| Symbol                                                  | File                                                                         | Line        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| `buildSpanTree`                                         | `packages/plugins/plugin-assistant/src/execution-graph/span-tree.ts`         | L112        |
| `applyEventLimit`                                       | same                                                                         | L211        |
| `ROOT_SPAN_ID`                                          | same                                                                         | L12         |
| `BEGIN_EVENT_TYPES`/`END_EVENT_TYPES`                   | same                                                                         | L47         |
| `walkSpanTree`/`flattenSpanTree`                        | same                                                                         | L245        |
| `buildExecutionGraph`                                   | `packages/plugins/plugin-assistant/src/execution-graph/execution-graph.ts`   | L91         |
| `presentEvent`                                          | same                                                                         | L118        |
| `isCollapsibleSpan`                                     | same                                                                         | L206        |
| `spanTreeToCommits`                                     | same                                                                         | L239        |
| `lastInSpanContext`                                     | same                                                                         | L282        |
| `formatCommitId`                                        | same                                                                         | L433        |
| `CommitSelector`                                        | same                                                                         | L446        |
| `GraphBuilder` / `doctor`                               | same                                                                         | L579 / L610 |
| `Trace.Meta` / `Trace.flatten`                          | `packages/core/compute/compute/src/Trace.ts`                                 | L102 / L178 |
| `Process.Info` / `Process.State`                        | `packages/core/compute/compute/src/Process.ts`                               | L365 / L321 |
| `AGENT_PROCESS_KEY`                                     | `packages/core/compute/functions-runtime/src/agent-service/agent-process.ts` | L54         |
| `Commit` type                                           | `packages/ui/react-ui-components/src/components/Timeline/Timeline.tsx`       | L40         |
| `TracePanel` `useExecutionGraph` / default `eventLimit` | `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.tsx` | L138 / L153 |

## Appendix B: Visual contract examples

Top-level operation with no inner events (collapsed) —
`execution-graph.test.ts#L194`:

```
●  [function] Reply - Success
```

Nested operation under an agent (sub-op collapsed) —
`execution-graph.test.ts#L223`:

```
●     [atom] Agent processing request...
├──●  [user] hello
│  ●  [function] Lookup - Success
◆──╯  [atom] Agent completed request
```

Pending agent span with user message —
`execution-graph.test.ts#L296`:

```
●     [atom] Agent processing request...
├──●  [user] hello
```

Sequential agent requests on one pid (single shared lane) —
`trace-timeline.node.test.ts#L141`:

```
●     [atom] Agent processing request...
├──●  [user] List all available schemas. Tell me what typenames are available.
│  ●  [function] List schemas - Success
◆──╯  [atom] Agent completed request
●  │  [atom] Agent processing request...
│  ●  [user] Create an organization called "DXOS" and a person named "Alice".
│  ●  [function] Create object - Success
│  ●  [function] Create object - Success
◆──╯  [atom] Agent completed request
●  │  [atom] Agent processing request...
│  ●  [user] Search for all organizations and persons.
│  ●  [function] Query - Success
│  ●  [function] Query - Success
◆──╯  [atom] Agent completed request
```
