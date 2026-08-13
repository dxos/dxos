# Mailbox pipelines — current state and target design

Status: **design, not built.** Records the analysis behind turning the closed `ScanMailbox` cascade
into an open, contributable processor topology. Sibling docs: [`PLAN.md`](PLAN.md) (product plan),
[`TASKS.md`](TASKS.md) (ledger), [`AUDIT.md`](AUDIT.md) (component/test index).

## The target, in two halves

1. **Sync pipeline** — dispatches to the connector bound to the mailbox, mechanical (non-LLM) stages.
2. **Post-sync pipelines** — multiple cursors over the Mailbox Feed, where plugins (plugin-brain,
   plugin-crm, …) contribute additional processors.

Half 1 **already exists and is the template for half 2.** Half 2 is the gap.

## Half 1 is done: `sync/mail-sync.ts`

A provider-agnostic harness where the provider is an Effect service (`MailSyncProvider`); each
provider operation is the same effect with its own layer provided. The harness owns everything not
provider-specific: binding/mailbox/feed loads, window resolution, the dedup → cap → process → commit
pipeline, the progress monitor, cancellation and stats. plugin-google and plugin-jmap each contribute
a layer; neither owns any of the machinery above.

Why a **service + layer** is right here: exactly **one** provider is active per operation. That is
the shape a `Context.Tag` models well, and it is why the same shape is _wrong_ for half 2.

## Half 2 today: a closed cascade

`operations/scan/scan-mailbox.ts` holds `plan: Record<MailboxTier, () => Stage[]>` — all five stages
enumerated inline, each operation imported directly. Nothing outside plugin-inbox can add one.

The consequence is visible in the code: plugin-brain injects `Analyze` as a **toolbar menu item**
(`InboxCapabilities.MailboxAction`) because no processor seam exists. A menu capability is doing a
pipeline capability's job. plugin-crm does the same with `Process CRM`.

### Inventory — 10 feed consumers, excluding sync

The Scan cascade (5 processors across 4 cost tiers):

| Operation               | Tier          | Cost           | Progress / idempotency                    |
| ----------------------- | ------------- | -------------- | ----------------------------------------- |
| `ExtractCorrespondents` | deterministic | none           | **no cursor** — identity index            |
| `ExtractSubscriptions`  | deterministic | none           | **no cursor** — wholesale replace         |
| `ClassifyMailbox`       | classify      | cheap LLM      | cursor, **tagged** `classifyMailbox`      |
| `SummarizeMailbox`      | summarize     | 1 LLM call/msg | **no cursor** — skips by newest thread id |
| `AnalyzeMailbox`        | analyze       | 1 LLM call/msg | cursor, **untagged**                      |

Outside the cascade:

- `ExtractMailbox` — `@deprecated`, superseded by the `ExtractMessage` dispatchers.
- `CrmOperation.ProcessMailbox` — cursored (tagged); scaffolds a Profile per new contact. Overlaps
  `ExtractCorrespondents` in purpose and competes with it from a separate toolbar entry.
- plugin-projects `UpdateProjectTasks`, `UpdateTravelLog`, `UpdateInvestorLog` — whole-feed
  filter-and-regenerate, no cursor.

Per-message one-shots (`ExtractMessage`, `CreateProjectFromMessage`, `UnsubscribeSender`,
`GenerateReply`, …) and the `ResetFeedCursor` utility are not pipelines and are excluded.

### Three cursor strategies where there should be one

Tagged cursor (2), untagged cursor (1), no cursor (7). The mechanism to do this uniformly already
exists — `findOrCreateFeedCursor(mailbox, id)` in `operations/cursor.ts` — with exactly one adopter.

`AnalyzeMailbox` is the fragile case: it finds its cursor by looking for the one with **zero meta
keys** (`analyze-mailbox.ts:36`), because a foreign-key tag marks another consumer's cursor. "Untagged"
is not an identity, it is the absence of one — so any future consumer that forgets to tag its cursor
gets silently adopted, and analysis resumes from that consumer's watermark, skipping everything below
it. Silent under-analysis, no error.

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

Each processor declares `after: [processorId]`. The harness topologically sorts, so ordering is data
rather than the hardcoded `MAILBOX_TIER_ORDER` literal. This is the general form, and it is the one
that can be **surfaced to the user for reordering via tooling** — the reason it was chosen over cost
tiers or numeric priority.

The existing cost tiers do not disappear; they become the default edges. The cascade's real contract
is "each tier's output gates the next" (classification consults the Person objects the contact pass
creates, so a known sender is never billed to the model), and that contract is expressible as
dependency edges without loss.

### D4 — Failure policy follows from the DAG

A failed processor fails its **descendants** in the DAG; independent branches continue. This replaces
today's all-or-nothing `continueOnError`, which aborts everything downstream in list order regardless
of whether it actually consumed the failed processor's output. Deferred until the DAG lands — the
edges are what make it computable.

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

## Open defect this design absorbs

**A missing `FactStore` fails the cascade instead of skipping the processor.** `AnalyzeMailbox`
declares `services: [AiService, Database.Service, FactStore, Trace.TraceService]`, resolved eagerly by
the process invoker at spawn time. plugin-brain is the only plugin contributing a `FactStore` layer,
so with brain disabled the tier dies with a `ServiceNotAvailableError` naming the tag — structurally
the same unmet precondition that `ai-gate.ts` absorbs for `AiService`. But `isAiUnavailableCause`
matches only `AiService.AiService.key` and `AiModelNotAvailableError`, so the stage is classified
`failed`, and with `continueOnError` defaulting to false one absent layer aborts the whole run.

The suite documents this by dodging it — `scan-mailbox.test.ts:166` excludes `analyze` with "it needs
a FactStore this layer does not provide, so it would fail".

`FactStore` is the **only** service any mailbox pipeline requires beyond `AiService` / `Database` /
`Trace`, so a per-processor "which tags are soft preconditions" mechanism would be machinery for a
single case. Make it uniform instead: any `ServiceNotAvailableError` → `skipped` with the tag named.
The soft set is not processor-specific; it is "whatever the host app did not contribute", and every
tier already treats `AiService` that way.

D5 removes the common case; the uniform gate remains as the safety net for a contributed processor
whose own plugin fails to provide something it declared.

**Not yet reproduced** — inferred from the service declaration, the classification branch, and that
test comment. Write the failing test first.

## Sequencing

1. Failing test for the missing-`FactStore` classification; then the uniform gate.
2. Tag `AnalyzeMailbox`'s cursor with an explicit id (plus a one-time migration for existing untagged
   cursors), removing the "untagged means mine" inference.
3. `MailboxProcessor` capability + topology resolution in the harness; port the five built-ins.
4. Move `AnalyzeMailbox` to plugin-brain and `ProcessMailbox` to a contributed processor; drop
   `@dxos/pipeline-rdf` from plugin-inbox.
5. Generalize off `Mailbox` to a feed-generic processor host.
