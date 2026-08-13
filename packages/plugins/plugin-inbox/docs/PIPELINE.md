# Mailbox pipelines — current state and target design

Records the analysis behind turning the closed `ScanMailbox` cascade into an open, contributable
processor topology, and the decisions taken along the way.

Status: **D1-D3 built, D4-D6 outstanding.** The `MailboxProcessor` capability, `operations/topology.ts`
and `ScanMailbox` resolving its run from contributions have all landed; D4 is now buildable but not
built, D5 and D6 are still design. See [Sequencing](#sequencing).

Sibling docs: [`PLAN.md`](PLAN.md) (product plan), [`TASKS.md`](TASKS.md) (ledger),
[`AUDIT.md`](AUDIT.md) (component/test index).

## The target, in two halves

1. **Sync pipeline** — dispatches to the connector bound to the mailbox, mechanical (non-LLM) stages.
2. **Post-sync pipelines** — multiple cursors over the Mailbox Feed, where plugins (plugin-brain,
   plugin-crm, …) contribute additional processors.

Half 1 already existed and was the template for half 2, which is now open too — though the passes it
runs are still all mailbox-shaped and still all live in plugin-inbox. The inventory below lists both
halves, and their stages, in one table.

## Half 1 is done: `sync/mail-sync.ts`

A provider-agnostic harness where the provider is an Effect service (`MailSyncProvider`); each
provider operation is the same effect with its own layer provided. The harness owns everything not
provider-specific: binding/mailbox/feed loads, window resolution, the dedup → cap → process → commit
pipeline, the progress monitor, cancellation and stats. plugin-google and plugin-jmap each contribute
a layer; neither owns any of the machinery above.

Why a **service + layer** is right here: exactly **one** provider is active per operation. That is
the shape a `Context.Tag` models well, and it is why the same shape is _wrong_ for half 2.

## Half 2: how it opened

`operations/scan/scan-mailbox.ts` used to hold `plan: Record<MailboxTier, () => Stage[]>` — all five
passes enumerated inline, each operation imported directly, nothing outside plugin-inbox able to add
one. The consequence was visible in the code: plugin-brain injected `Analyze` as a **toolbar menu
item** (`InboxCapabilities.MailboxAction`) because no processor seam existed, a menu capability doing
a pipeline capability's job; plugin-crm did the same with `Process CRM`.

The cascade now reads `InboxCapabilities.MailboxProcessor` contributions and orders them by the
`after` edges each declares. plugin-inbox contributes its own five through the same seam
(`capabilities/mailbox-processors.ts`), so there is no privileged built-in path to drift from the
contributed one. **The menu items have not been retired yet** — that is D5.

### Inventory — every pipeline over a mailbox, and its stages

One table, both halves and both granularities. **Processor** is the contributed id (the topology key
and the cursor tag); `—` means the pipeline is not a contributed processor. **Stages** are the
`@dxos/pipeline` `Stage`s _inside_ one run — the finer unit D2 keeps separate from a processor, which
is a whole separately-spawned operation. `⋈` is a stream merge, `»` a `Stream.grouped` page, and the
last element of each chain is the `Pipeline.run` sink.

| Pipeline (owner)                    | Processor       | Tier          | Cost               | Cursor                   | Stages                                                                                                                       |
| ----------------------------------- | --------------- | ------------- | ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GoogleMailSync` (google)           | —               | sync          | none               | `Cursor.ExternalCursor`  | `dedup` → bound → `decode` ⋈ `reconcile` → attachments → contacts → drafts → `collect-stats` → commit-unit » `Cursor.commit` |
| `JmapSync` (jmap)                   | —               | sync          | none               | `Cursor.ExternalCursor`  | same shared harness as above (`sync/mail-sync.ts`)                                                                           |
| `ExtractCorrespondents` (inbox)     | `contacts`      | deterministic | none               | none — identity index    | `build-contact` → sink (add Organization / Person)                                                                           |
| `ExtractSubscriptions` (inbox)      | `subscriptions` | deterministic | none               | none — replaces state    | `extract-unsubscribe` » 50 → sink (aggregate per sender)                                                                     |
| `ClassifyMailbox` (inbox)           | `classify`      | classify      | cheap LLM, ≤100    | tagged `classifyMailbox` | » page → `classify` → sink (advance cursor per LLM page)                                                                     |
| `SummarizeMailbox` (inbox)          | `summarize`     | summarize     | 1 call/msg, ≤50    | none — newest thread id  | **none** — plain loop over threads                                                                                           |
| `AnalyzeMailbox` (inbox\*)          | `analyze`       | analyze       | 1 call/msg, no cap | tagged `analyzeMailbox`  | delegates to `runFactPipeline`: `facts-dedup` → `extract-facts-unit` → `facts-log` » page → sink (`putFacts` + advance)      |
| `CrmOperation.ProcessMailbox` (crm) | —               | —             | LLM (optional)     | tagged                   | **none** — plain paged loop                                                                                                  |
| `UpdateProjectTasks` (projects)     | —               | —             | none               | none — whole feed        | **none** — filter + regenerate                                                                                               |
| `UpdateTravelLog` (projects)        | —               | —             | none               | none — whole feed        | **none** — filter + regenerate                                                                                               |
| `UpdateInvestorLog` (projects)      | —               | —             | LLM                | none — whole feed        | **none** — filter + regenerate                                                                                               |
| `ExtractMailbox` (inbox)            | —               | —             | LLM                | none                     | **none** — `@deprecated`                                                                                                     |

\* Moves to plugin-brain under D5.

Everything not marked `—` in **Processor** is invoked by the Scan cascade. The exceptions:
`GoogleMailSync`/`JmapSync` run from the Sync toolbar action or a routine; `AnalyzeMailbox` is ALSO
reachable from brain's `Analyze` menu item and `ProcessMailbox` only from crm's `Process CRM` — the
duplication D5 removes. The projects trio run from project routines.

Two things the stages column makes visible:

- **Only four of the twelve have an internal pipeline at all.** The rest are plain loops, so the
  `@dxos/pipeline` machinery is not the shared substrate it might look like from the sync half.
- **On-arrival extraction is commented out of the sync chain** (`mail-sync.ts`), because it reaches
  `Capability.Service` and invokes `ExtractMessage`, neither of which exists off-host. Factoring it
  into a processor that runs where those services do is exactly what half 2 is for — a fifth candidate
  for D6 beyond the projects trio.

Per-message one-shots (`ExtractMessage`, `CreateProjectFromMessage`, `UnsubscribeSender`,
`GenerateReply`, …) and the `ResetFeedCursor` utility are not pipelines and are excluded.

### Two cursor strategies where there should be one

Tagged cursor (3: `classify`, `analyze`, CRM's `ProcessMailbox`), no cursor (7). The untagged case is
gone; the shared mechanism is `findOrCreateFeedCursor(mailbox, id)` in `operations/cursor.ts`.

`AnalyzeMailbox` was the fragile one: it found its cursor by looking for the one with **zero meta
keys**, because a foreign-key tag marks another consumer's cursor. "Untagged" is not an identity, it is
the absence of one — so any future consumer that forgot to tag its cursor got silently adopted, and
analysis resumed from that consumer's watermark, skipping everything below it. FIXED: it carries
`ANALYZE_CURSOR_KEY_ID`, and a legacy untagged cursor is adopted **in place** so existing mailboxes
keep their position rather than re-analyzing the whole feed at one model call per message.

Seven consumers still keep no cursor at all. Since a processor id is now also its cursor tag, giving
those a cursor is mechanical rather than a design question — but each needs its own judgement about
whether feed position or derived-state replacement is the right idempotency story.

## Decisions

### D1 — Extension is a capability contribution, not an Effect service

Half 2 needs **N** processors active simultaneously, contributed by different plugins. A
`Context.Tag` models a single active implementation, so it does not fit. `Capability.contributeAll`
does, and the pattern is already in use next door (`MailboxAction`, `SenderAction`).

### D2 — Naming: `Processor` in a `Topology`, borrowed from Kafka Streams

`Pipeline` and `Stage` are both **taken** by `@dxos/pipeline`, at a finer granularity:
`Stage<In, Out, E, R>` is a stream transform (`Stream → Stream`) used _within_ one run — including
inside `mail-sync`'s own dedup → cap → process → commit chain. The unit here is coarser: an
independently-cursored, separately-spawned **operation**. Reusing either name would overload one term
across two granularities in the same subsystem.

Kafka Streams already has exactly this vocabulary, and the DAG decision (D3) makes it fit:

- **`Processor`** — a node: one cursored pass over the feed. `InboxCapabilities.MailboxProcessor`.
- **`Topology`** — the DAG of processors the harness resolves and runs.
- **offset** — our `Cursor`. Independent per processor, exactly like a Kafka consumer group.

"Pipeline" survives as the informal collective noun, which is what existing repo prose already uses.

### D3 — Ordering is a DAG, declared per processor

BUILT. Each processor declares `after: [processorId]`; the harness topologically sorts, so ordering is
data rather than the `MAILBOX_TIER_ORDER` literal that used to encode it (now deleted). This is the
general form, and the one that can be **surfaced to the user for reordering via tooling** — the reason
it was chosen over cost tiers or numeric priority.

The cost tiers did not disappear, but they came out differently than sketched: a tier is a **filter**
(`tiers` selects which processors run) and a report label, while the edges are declared explicitly per
processor. The cascade's real contract — classification consults the Person objects the contacts pass
creates, so a known sender is never billed to the model — is carried by `after: ['contacts']` rather
than by tier order.

`operations/topology.ts` is pure and ECHO-free, with three rules all chosen so one bad contributor
cannot break everyone else's run — the same principle as treating an unprovided service as a skip:

- **Unknown `after` ids are ignored** — naming a processor whose plugin is not installed is the normal
  case for an optional dependency, not an error.
- **Duplicate ids keep the first contribution**, excluding later ones: ids are cursor tags, so two
  processors sharing one would share a watermark and silently skip each other's work.
- **A cycle excludes only the nodes it blocks**, and every member names the whole cycle, since a cycle
  has no single culprit.

Ties resolve to contribution order — a topology that reshuffled between runs would make cursor
behaviour irreproducible.

**Implementation note worth keeping.** `ScanMailbox` declares `Capability.Service`, which the operation
runtime does provide (`process-manager-capability.ts` wires it explicitly for operations that declare
it, including the routine and trigger paths). But it is resolved through the `ServiceResolver`, NOT the
caller's Effect context — so a test cannot supply it with `Effect.provideService` and must go through
`AssistantTestLayer`'s `extraServices`.

### D4 — Failure policy follows from the DAG

NOT BUILT — the DAG has landed, so this is now buildable, but `continueOnError` still aborts in list
order. Intended: a failed processor fails its **descendants**; independent branches continue. Today a
failing `classify` also strands `subscriptions` if it happens to sit behind it in the run, even though
nothing connects them.

### D5 — `AnalyzeMailbox` moves to plugin-brain

A contributed processor belongs with its contributor. brain then contributes the processor **and** the
`FactStore` layer atomically.

This is worth stating precisely, because an earlier reading in `TASKS.md` got it wrong. There is **no
dependency cycle today** — `FactStore` and `FactStoreLive` are both from `@dxos/pipeline-rdf`, a
direct plugin-inbox dependency, and brain is not a dependency of inbox in either direction. The move
is not dependency inversion; it is that under this design `analyze` is a _contributed_ processor
rather than a built-in tier, and inbox has no business owning one.

Payoff: plugin-inbox drops `@dxos/pipeline-rdf`, and the missing-`FactStore` failure below becomes
**structurally impossible** rather than gracefully degraded. `CrmOperation.ProcessMailbox` gets the
same treatment — a contributed processor instead of a rival toolbar button.

### D6 — Generalize now, mailbox as instance #1

The abstraction is "a durable feed plus N independently-cursored consumers contributed by plugins".
Nothing in it is mail-specific. The second instance already exists (plugin-projects' three whole-feed
pipelines) and transcription is a third, so the generic shape is designed now and mailbox is the first
adopter rather than a retrofit.

## Defect this design absorbed (FIXED)

**A missing `FactStore` failed the cascade instead of skipping the processor.** `AnalyzeMailbox`
declares `services: [AiService, Database.Service, FactStore, Trace.TraceService]`, resolved eagerly by
the process invoker at spawn time. plugin-brain is the only plugin contributing a `FactStore` layer, so
with brain disabled the tier died with a `ServiceNotAvailableError` naming the tag — structurally the
same unmet precondition `ai-gate.ts` absorbs for `AiService`. But `isAiUnavailableCause` matched only
`AiService.AiService.key` and `AiModelNotAvailableError`, so the stage was classified `failed`, and
with `continueOnError` off one absent layer aborted the whole run.

The suite had documented this by dodging it — `scan-mailbox.test.ts` excluded `analyze` with "it needs
a FactStore this layer does not provide, so it would fail".

REPRODUCED before fixing, and the inference held exactly:
`ServiceNotAvailable: Service not available: @dxos/pipeline-rdf/FactStore` → `completed: 2, failed: 1`.

`unmetPrecondition` in `operations/precondition.ts` is now uniform over the tag rather than per-stage:
the soft set is not a property of a processor, it is whatever the deployment did not contribute, and
`Database`/`Trace` cannot be missing since the cascade could not have spawned. The two AI flavours keep
their own wording, because users experience "the assistant is not up" as one condition rather than a
missing tag. Matched structurally with a message fallback, not by class — the error is flattened
crossing the invocation boundary. The dodge is gone, and that test now exercises both precondition
flavours in one run.

D5 will remove the common case entirely; the uniform gate stays as the safety net for a contributed
processor whose own plugin fails to provide something it declared.

## Sequencing

1. ~~Failing test for the missing-`FactStore` classification; then the uniform gate.~~ DONE —
   `unmetPrecondition` in `operations/precondition.ts`.
2. ~~Tag `AnalyzeMailbox`'s cursor with an explicit id (plus a one-time migration for existing
   untagged cursors), removing the "untagged means mine" inference.~~ DONE.
3. ~~`MailboxProcessor` capability + topology resolution in the harness; port the five built-ins.~~ DONE.
4. **D4** — failure policy from the DAG edges, replacing list-order `continueOnError`.
5. **D5** — move `AnalyzeMailbox` to plugin-brain and `ProcessMailbox` to a contributed processor;
   retire brain's `Analyze` and crm's `Process CRM` menu items; drop `@dxos/pipeline-rdf` from
   plugin-inbox.
6. **D6** — generalize off `Mailbox` to a feed-generic processor host.
7. Give the seven cursorless consumers a cursor, now that a processor id is also its cursor tag.
