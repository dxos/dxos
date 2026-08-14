# Mailbox pipelines

How mail gets into a mailbox and what runs over it afterwards. Sibling docs: [`PLAN.md`](PLAN.md)
(product plan), [`TASKS.md`](TASKS.md) (ledger), [`TESTING.md`](TESTING.md) (manual test plan),
[`AUDIT.md`](AUDIT.md) (component/test index).

**Status:** D1–D3 and D5 built; D4 and D6 outstanding. See [Open](#open).

## The shape

1. **Sync** — dispatches to the connector bound to the mailbox and **writes** the feed. Mechanical, no LLM.
2. **Scan** — **reads** the feed through N independent cursors, running processors that plugins contribute.

Both halves are extensible, by deliberately different mechanisms. Sync's provider is an Effect
service (`MailSyncProvider`) because exactly **one** provider is active per operation — the shape a
`Context.Tag` models. Scan needs **N** processors active at once from different plugins, which a tag
cannot express, so it is a capability contribution (`InboxCapabilities.MailboxProcessor`).

A third seam covers one-shot operations a surface invokes rather than the cascade running:
`ReplyGenerator` and `MailSendOperation` each contribute **one** operation typed against a contract
plugin-inbox owns (`ReplyGeneration`, `MailSend`). Pick by what is being contributed — a single
implementation resolved at runtime (service), a set the cascade runs (processor), or one operation a
surface calls (contract capability).

`sync/mail-sync.ts` is a provider-agnostic harness owning everything not provider-specific:
binding/mailbox/feed loads, window resolution, the dedup → cap → process → commit pipeline, progress,
cancellation and stats. plugin-google and plugin-jmap each contribute only a layer.
`operations/scan/scan-mailbox.ts` resolves contributed processors into a run order from the `after`
edges each declares, and plugin-inbox contributes its own four through the same seam — so there is no
privileged built-in path to drift from the contributed one.

## Vocabulary

Two granularities, deliberately not sharing a name:

- **Processor** — one cursored pass over the feed: a separately-spawned operation with its own
  watermark. Kafka Streams' term, whose `Topology` is the DAG the harness resolves.
- **Stage** — `@dxos/pipeline`'s `Stream → Stream` transform _inside_ one run.

`Pipeline` and `Stage` were both already taken by `@dxos/pipeline` at the finer granularity, so
reusing either for a processor would overload one word across two granularities in the same
subsystem. "Pipeline" survives as the informal collective noun.

A processor's `id` is also its **cursor tag**, so two processors sharing an id would share a
watermark and silently skip each other's work.

## Inventory

**Processor** is the contributed id; `—` means the pipeline is not a contributed processor. `⋈` is a
stream merge, `»` a `Stream.grouped` page, and the last element of each chain is the sink.

| Plugin          | Operation               | Processor       | Tier          | Cost               | Cursor                   | Stages                                                                                                                       |
| --------------- | ----------------------- | --------------- | ------------- | ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| plugin-google   | `GoogleMailSync`        | —               | sync          | none               | `Cursor.ExternalCursor`  | `dedup` → bound → `decode` ⋈ `reconcile` → attachments → contacts → drafts → `collect-stats` → commit-unit » `Cursor.commit` |
| plugin-jmap     | `JmapSync`              | —               | sync          | none               | `Cursor.ExternalCursor`  | same harness (`sync/mail-sync.ts`)                                                                                           |
| plugin-inbox    | `ExtractCorrespondents` | `contacts`      | deterministic | none               | none — identity index    | `build-contact` ⇒ add Organization / Person                                                                                  |
| plugin-inbox    | `ExtractSubscriptions`  | `subscriptions` | deterministic | none               | none — replaces state    | `extract-unsubscribe` » 50 ⇒ aggregate per sender                                                                            |
| plugin-inbox    | `ClassifyMailbox`       | `classify`      | classify      | cheap LLM, ≤100    | tagged `classifyMailbox` | » page → `classify` ⇒ advance per LLM page                                                                                   |
| plugin-crm      | `ProcessMailbox`        | `crm`           | classify      | LLM (optional)     | tagged                   | none — plain paged loop                                                                                                      |
| plugin-inbox    | `SummarizeMailbox`      | `summarize`     | summarize     | 1 call/msg, ≤50    | none — newest thread id  | none — loop over threads                                                                                                     |
| plugin-brain    | `AnalyzeMailbox`        | `analyze`       | analyze       | 1 call/msg, no cap | tagged `analyzeMailbox`  | `facts-dedup` → `extract-facts-unit` → `facts-log` » page ⇒ `putFacts` + advance                                             |
| plugin-projects | `UpdateProjectTasks`    | —               | —             | none               | none — whole feed        | none — filter + regenerate                                                                                                   |
| plugin-projects | `UpdateTravelLog`       | —               | —             | none               | none — whole feed        | none — filter + regenerate                                                                                                   |
| plugin-projects | `UpdateInvestorLog`     | —               | —             | LLM                | none — whole feed        | none — filter + regenerate                                                                                                   |
| plugin-inbox    | `ExtractMailbox`        | —               | —             | LLM                | none                     | none — `@deprecated`                                                                                                         |

Everything with a processor id runs from the Scan cascade. The sync pair runs from the Sync toolbar
action or a routine; `AnalyzeMailbox` is also reachable from brain's "Mailbox Facts" routine; the
projects trio run from project routines. Per-message one-shots (`ExtractMessage`,
`CreateProjectFromMessage`, `UnsubscribeSender`, …) are not pipelines; neither is `GenerateReply`,
which plugin-brain contributes through `ReplyGenerator` for the message surfaces to call.

```
Mailbox
└── feed                                     the durable log every pipeline below reads
    │
    ├── SYNC — WRITES the feed
    │   └── GoogleMailSync │ JmapSync        one harness, provider layer swapped
    │       ├── dedup                        on foreignId/key, against the cursor's seed set
    │       ├── bound                        cap at maxMessages
    │       ├── decode                       provider item → insert Change
    │       ├── ⋈ reconcile                  retag/delete branch, merges in here
    │       ├── processAttachments
    │       ├── ✗ onArrivalExtractors        COMMENTED OUT — needs Capability.Service off-host
    │       ├── extractContacts
    │       ├── reconcileDrafts
    │       ├── collect-stats
    │       ├── toCommitUnit
    │       └── » commitPageSize ⇒ Cursor.commit
    │
    └── SCAN — READS the feed, one cursor per processor
        └── ScanMailbox                      topology from MailboxProcessor contributions
            ├── contacts       [inbox]       no cursor
            ├── subscriptions  [inbox]       no cursor
            ├── classify       [inbox]       after: contacts
            ├── crm            [crm]         after: contacts
            ├── summarize      [inbox]       after: contacts, classify
            └── analyze        [brain]       after: summarize · opt-in, not in the default tiers
                └── runFactPipeline ⇒ putFacts + advance

NOT CONTRIBUTED — same feed, outside the topology
    ├── UpdateProjectTasks / UpdateTravelLog / UpdateInvestorLog   projects · project routines
    └── ExtractMailbox                                             inbox    · @deprecated
```

Two things this makes visible:

- **Only four of the twelve have an internal stage chain.** The rest are plain loops, so
  `@dxos/pipeline` is not the shared substrate the sync half suggests.
- **On-arrival extraction is commented out of the sync chain**, because it reaches
  `Capability.Service` and invokes `ExtractMessage`, neither available off-host under edge compute.
  Moving it to a processor that runs where those services exist is exactly what Scan is for.

## Decisions

**D1 — Extension is a capability contribution, not an Effect service.** BUILT; see
[The shape](#the-shape) for why the two halves differ.

**D2 — Naming: `Processor` in a `Topology`.** BUILT; see [Vocabulary](#vocabulary).

**D3 — Ordering is a DAG, declared per processor.** BUILT. Each declares `after: [processorId]` and
the harness topologically sorts, so ordering is data rather than a hardcoded literal — the form that
can be surfaced to the user for reordering via tooling, which is why it beat cost tiers or numeric
priority. A tier turned out to be a **filter** (`tiers` selects which processors run) and a report
label; the cascade's real contract — classification consults the Person objects the contacts pass
creates, so a known sender is never billed to the model — is carried by `after: ['contacts']`.

`operations/topology.ts` is pure and ECHO-free, with three rules all chosen so one bad contributor
cannot break everyone else's run: unknown `after` ids are ignored (an optional dependency whose plugin
is absent); duplicate ids keep the first (ids are cursor tags); a cycle excludes only the nodes it
blocks, every member naming the whole cycle. Ties resolve to contribution order, since a topology that
reshuffled between runs would make cursor behaviour irreproducible.

> `ScanMailbox` declares `Capability.Service`, which the operation runtime provides — but resolves
> through the `ServiceResolver`, NOT the caller's Effect context. A test cannot supply it with
> `Effect.provideService`; it must use `AssistantTestLayer`'s `extraServices`.

**D4 — Failure policy follows from the DAG.** NOT BUILT. `continueOnError` still aborts in list order,
so a failing processor strands whatever sits behind it even when nothing connects them. Intended: a
failed processor fails its descendants; independent branches continue.

**D5 — An operation belongs to the plugin that owns what it needs.** BUILT. plugin-brain contributes the
`analyze` processor **and** the `FactStore` layer it needs, so a deployment without brain has no
analyze pass rather than one that dies resolving a service nobody provided — the missing-`FactStore`
case is structurally impossible, not merely handled. `AnalyzeMailbox` itself moved to `BrainOperation`,
which **changed its DXN**; that key was released, so a routine bound to the old one is orphaned
(accepted deliberately, pre-1.0). plugin-crm's cursored pipeline became the `crm` processor declared
`after: ['contacts']`, consuming inbox's contact extraction instead of competing with it.

`GenerateReply` followed for the same reason, taking plugin-inbox's `@dxos/pipeline-rdf` dependency
with it — inbox now has none. It could not move wholesale: two inbox containers invoke it directly, so
relocating the operation alone would have inverted the plugin dependency. Hence the third seam above.
Two consequences worth keeping: the AI-reply affordance is now absent when nothing is contributed
rather than offered and failing, and the contract means a contributor cannot supply an operation the
surfaces cannot call.

Both moves changed a released DXN, so routines bound to the old keys are orphaned — accepted
deliberately, pre-1.0. Note the changesets are `minor`, not `major`: at 0.x a breaking change rides
the minor, and `major` would cut 1.0.0 across the whole fixed publish group.

**D6 — Generalize off `Mailbox`.** NOT BUILT, and weaker than first written. It also now carries a
deferred question: whether a processor can fan out over N subjects (the plugin-projects trio needs one
invocation per Project) and what cursor identity that implies — per-(processor, subject) rather than
per-processor. Deferred here deliberately, because D6 has to answer "what is the subject of a pass"
regardless. The abstraction is "a
durable feed plus N independently-cursored consumers contributed by plugins", and the parts that
matter are already generic: `topology.ts` knows only `{id, after}`, `precondition.ts` knows only
`Cause`s, and a feed cursor's `target` is already an untyped association anchor. What is mailbox-typed
is the `MailboxProcessor` subject and `tier`, `ScanMailbox`'s input and progress key, and
`findOrCreateFeedCursor`, which takes a `Mailbox` only to read `mailbox.feed`. The open question is
what replaces the subject: a structural `{ feed: Ref<Feed> }`, a `FeedOwner` annotation, or passing
the `Feed` and letting each processor resolve its own.

CORRECTION: the plugin-projects trio was cited here as the second instance. It is not — all three read
`mailbox.feed`, so they need no generalization and could be contributed as `MailboxProcessor`s today.
That is the cheaper move hiding behind D6: it puts them in the DAG and gives three of the seven
cursorless consumers a cursor. The only genuine second instance is transcription, which owns its own
`Feed` — but its `messageEnricher` runs BEFORE a message is written, a write-time seam closer to
sync's inline stages than to a cursored read-time pass, so it may want the other half's shape.

## Fixed along the way

- **A missing service failed the cascade instead of skipping the processor.** Only the `AiService`
  flavour counted as an unmet precondition; anything else was a genuine failure, so one absent layer
  aborted the run. Reproduced, then made uniform over the tag in `operations/precondition.ts` — the
  soft set is not a property of a processor, it is whatever the deployment did not contribute.
- **The analysis cursor was identified by having no foreign key.** "Untagged" is the absence of an
  identity, so any later consumer that forgot to tag its own was silently adopted and analysis resumed
  from that consumer's watermark. It now carries `ANALYZE_CURSOR_KEY_ID`, and a legacy untagged cursor
  is adopted **in place** so existing mailboxes keep their position.

## Open

1. **D4** — failure policy from the edges.
2. **D6** — feed-generic processor host.
3. **Give the seven cursorless consumers a cursor** — mechanical now that an id is also a cursor tag,
   but each needs its own call on whether feed position or derived-state replacement is right.
