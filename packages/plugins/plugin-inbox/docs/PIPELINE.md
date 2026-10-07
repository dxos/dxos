# Mailbox pipelines

How mail gets into a mailbox and what runs over it afterwards. Sibling docs: [`PLAN.md`](PLAN.md)
(product plan), [`TASKS.md`](TASKS.md) (ledger), [`TESTING.md`](TESTING.md) (manual test plan),
[`PIPELINE-AUDIT.md`](PIPELINE-AUDIT.md) (pipeline/operation coverage index). `AUDIT.md` is a
separate decomposition audit, not a test index.

**Status:** D1–D6 all built. See [Open](#open) for what remains beyond them.

## The shape

1. **Sync** — dispatches to the connector bound to the mailbox and **writes** the feed. Mechanical, no LLM.
2. **Analyze** — **reads** the feed through N independent cursors, running processors that plugins contribute.

Both halves are extensible, by deliberately different mechanisms. Sync's provider is an Effect
service (`MailSyncProvider`) because exactly **one** provider is active per operation — the shape a
`Context.Tag` models. Analyze needs **N** processors active at once from different plugins, which a tag
cannot express, so it is a capability contribution (`InboxCapabilities.MailboxProcessor`).

A third seam covers one-shot operations a surface invokes rather than the cascade running:
`ReplyGenerator` and `MailSendOperation` each contribute **one** operation typed against a contract
plugin-inbox owns (`ReplyGeneration`, `MailSend`). Pick by what is being contributed — a single
implementation resolved at runtime (service), a set the cascade runs (processor), or one operation a
surface calls (contract capability).

`sync/mail-sync.ts` is a provider-agnostic harness owning everything not provider-specific:
binding/mailbox/feed loads, window resolution, the dedup → cap → process → commit pipeline, progress,
cancellation and stats. plugin-google and plugin-jmap each contribute only a layer.
`operations/analyze/analyze-mailbox.ts` resolves contributed processors into a run order from the `after`
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

The cascade runner calls its own plan entries **passes** (`analyze-mailbox.ts`), one per processor —
not "stages", which this vocabulary reserves for the finer granularity above.

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

Everything with a processor id runs from the Analyze cascade. The sync pair runs from the Sync toolbar
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
    └── ANALYZE — READS the feed, one cursor per processor
        └── AnalyzeMailbox                      topology from MailboxProcessor contributions
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

- **Six of the twelve have an internal stage chain**, and two of those are the same harness with the
  provider layer swapped — so five distinct chains across twelve pipelines. The rest are plain loops:
  `@dxos/pipeline` is not the shared substrate the sync half suggests.
- **On-arrival extraction is commented out of the sync chain**, because it reaches
  `Capability.Service` and invokes `ExtractMessage`, neither available off-host under edge compute.
  Moving it to a processor that runs where those services exist is exactly what Analyze is for.

## Operations

Two phases:

```text
Sync => ConnectorSpec.Connector => connector.sync.operation
Analyze => InboxOperation.AnalyzeMailbox => MailboxProcessor
```

### Sync

- Single pipeline with deterministic, fast (non-LLM) stages.
- Resolved through a REGISTRY rather than a topology: the toolbar action hands a target to
  `syncTarget`, which finds its binding, then its `Connection`, then the contributed
  `ConnectorSpec.Connector` whose `sync.operation` it runs. Note the two halves discover their
  extensions differently — a registry lookup here, a DAG sort there — and say so in different
  vocabularies.
- A connector declaring a `sync.trigger` is run by force-firing that trigger rather than invoking the
  operation, because the trigger dispatcher is what drives `Operation.runAgain()` continuation, so a
  capped run finishes its remaining batches. Gmail and JMAP both declare one; `Operation.invoke` is
  the fallback for a connector that does not.

### Analyze

- Multiple processors, each independently cursored.
- Contributed through `InboxCapabilities.MailboxProcessor`; `operations/analyze/analyze-mailbox.ts`
  resolves them, filters by tier, orders them by their `after` edges and invokes each in turn.

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

> `AnalyzeMailbox` declares `Capability.Service`, which the operation runtime provides — but resolves
> through the `ServiceResolver`, NOT the caller's Effect context. A test cannot supply it with
> `Effect.provideService`; it must use `AssistantTestLayer`'s `extraServices`.

**D4 — Failure policy follows from the DAG.** BUILT. By default (`continueOnError: false`) a failed
processor blocks exactly its descendants — `Topology.descendants` walks the transitive closure and each blocked pass is reported
with the upstream that invalidated it. Independent branches keep running: `subscriptions` declares no
edge to `classify`, so a classification failure no longer strands it for merely sitting later in the
list. A caller passing `continueOnError: true` gets the failure reported and nothing blocked.

Sharp edge pinned by test: a `tiers` filter DROPS the edges that ran through a filtered-out processor.
Selecting `['deterministic','classify','analyze']` leaves `analyze`'s `after: ['summarize']` pointing
at an absent node, so it is ignored and `analyze` runs despite the classification failure. Correct — a
processor the caller excluded cannot constrain anything, and `analyze` never consumed classification.

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

**D6 — BUILT 2026-08-15, and not as it was framed.** It was written as "generalize off `Mailbox`",
which is why it stayed open so long: framed that way it had one implementor and no second consumer, so
every costing said wait.

The actual defect was narrower and real. `findOrCreateFeedCursor` took ONE object playing two roles —
the feed's **owner** and the cursor's **subject**. They coincide for a mailbox scanned once; they do
not for a pass scoped to something narrower over a shared feed. Splitting the two parameters is D6,
and it is driven by a consumer that exists rather than by the prospect of one.

What shipped:

1. `findFeedCursor` / `findOrCreateFeedCursor` take `subject`, defaulting to the owner — so every
   pre-existing call site is unchanged.
2. `isConsumerCursor` now matches on `spec.target`. **This was the whole of the "cursor identity"
   problem this document called blocking and specified a composite `(processor id, subject id)` key
   for.** No key format was needed: the write side already stored the target and the predicate simply
   ignored it.
3. `createInvocation` → `createInvocations`, returning `{ subject?, operation, input }[]`. Invocations
   keep the contributing processor's id, so the `after` edges and descendant blocking are untouched.
4. First consumer: `plugin-projects`' `syncProjectTasks` keeps a cursor per Project over the shared
   mailbox feed, replacing a full-feed rescan per project per run.

What it did NOT need, against the four candidates below: `Ref.byAnnotation` (dropped twice, and it
never removed the runtime guard it was meant to replace), a generic feed host, a change to
`AnalyzeMailbox`'s own `Ref.Ref(Mailbox)` input, or any `MailboxTier` rework. The analysis below is
kept because it records what was considered and why the cheaper answer was not obvious.

### What is already generic

Three of the five pieces need no work, which is why the remaining scope is smaller than "generalize
the host" sounds:

| Piece                             | State                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| `operations/topology.ts`          | generic — knows only `{ id, after }`                         |
| `operations/precondition.ts`      | generic — knows only `Cause`s                                |
| `Cursor` itself                   | generic — `target` is already an untyped association anchor  |
| the **host** (`AnalyzeMailbox`)   | mailbox-typed — input, progress key, progress label, logging |
| the **seam** (`MailboxProcessor`) | mailbox-typed — subject param and `tier`                     |

### The subject is the feed's OWNER, not the feed

This is the part that is easy to get wrong, and it decides the shape of everything else. A feed cursor
is not identified by the feed alone:

```ts
spec: { kind: 'feed', source: mailbox.feed, target: Ref.make(mailbox) }
```

The **source** is the feed; the **target** is the Mailbox. There is no dedicated "consumer" ECHO
object, so the owner stands in as the association anchor — which means a processor's watermark is
identified by `(feed, owner, processor id)`, not by the feed. The host needs the owner for more than
the cursor: the progress key derives from the owner's URI, the progress label from its `name`, and the
run log from its URI.

So "run passes against feeds" understates the problem. The real question is **what plays the owner's
role** once it is not a Mailbox — and half the answer already exists.

#### `FeedAnnotation` is the marker, and it is already in use

`@dxos/schema`'s `FeedAnnotation` ("identifies a schema as an object with a canonical feed reference")
is exactly the `FeedOwner` marker this needs. It is not new work:

- **Set by** `Mailbox`, `Calendar`, magazine `Subscription`.
- **Read by** three consumers that already discover feed owners generically:
  `plugin-routine`'s `selectFeed` (queries the schema registry for annotated types, then their objects,
  then resolves each `feed`), assistant-toolkit's `hasFeedAnnotation`, and plugin-assistant's
  `AgentProperties`.

So the DISCOVERY half of a feed-generic host is built and shipping. What D6 adds is the cursored-pass
half.

#### An annotated ref — CLOSED 2026-08-15, after a round trip

`Ref.Ref` accepts a concrete `Type`, a relation, a `Type.Type`, or the "any object" schema. An
annotation-constrained overload — "a ref to any type carrying `FeedAnnotation`" — was the missing
piece. It existed briefly, twice, and is now deliberately gone.

What happened, in merge order:

1. `Ref.byAnnotation` was added on the inbox branch (`b5eba8b43d`, pinned against a real database in
   `ff5ba58a29`).
2. **#12575 dropped it** (`eb116fe356`, "drop `Ref.byAnnotation`, keep the `FeedAnnotation` property
   name"), keeping only the resolution half — `FeedAnnotation` carrying `{ property: string }`, plus
   `getFeedRef(obj)` and `isFeedOwnerSchema(schema)`, which `operations/cursor.ts` already uses.
   Merged 2026-08-14T05:24Z.
3. **#12577 put it back**, because that branch still carried the two commits from step 1 and the merge
   resurrected them. Merged 2026-08-14T22:46Z.

4. **#12612 dropped it again**, restoring the #12575 decision, once the accidental resurrection was
   noticed. It is not on `main`.

So the answer is settled and the reasoning is worth keeping, because it is the reason not to propose
this again: annotations do not participate in the type system, so `Ref.byAnnotation(X)` produced the
same TypeScript type as `Ref.Ref(Obj.Unknown)`; and the check is synchronous, so it could only inspect
a target already resident — an unresolved reference passed regardless, and the handler had to re-check
after loading either way. It bought nothing a runtime guard does not.

The lesson about the round trip is worth keeping too: a branch carrying commits that predate a review
decision will silently undo it on merge, and nothing warns.

#### Candidates, restated against those facts

1. **Annotated subject** (`FeedAnnotation` + `Ref.Ref(Obj.Unknown)` + a runtime guard). Reuses the
   existing marker and its three consumers; makes the valid set explicit and discoverable. COST: loses
   boundary type-validation, moving it to a runtime error inside the handler.
2. **Structural** — any object with `feed: Ref<Feed>`. No schema work at the value level, but the input
   schema problem is identical (still `Obj.Unknown`), and the valid set becomes accidental rather than
   declared. Strictly worse than 1 now that the annotation exists.
3. **The feed alone**, each processor resolving its own subject. Removes the owner from the seam but
   pushes the cursor-anchor problem into every processor, and each would solve it differently.
4. ~~**`Ref.byAnnotation` as the subject.**~~ RULED OUT twice, most recently in #12612. It never
   removed the runtime guard it was meant to replace (see above), so option 1 loses nothing by
   comparison. Reviving it means re-opening a decision two reviews have now made.

### The sub-questions, as answered

- **Fan-out.** ANSWERED: yes, a processor may cover N subjects — `createInvocations` returns a list.
  An empty list reports as skipped rather than vanishing, since a pass that found nothing must stay
  distinguishable from one that was never contributed.
- **Cursor identity under fan-out.** ANSWERED, and more cheaply than predicted: the tag stays the
  processor id, and the SUBJECT joins the cursor's identity through `spec.target`. No composite key.
- **Tiers.** Untouched, and no longer blocking anything: `MailboxTier` stays an opaque per-host
  vocabulary. Nothing forces the question while there is one host to disagree with it.

### There is no second consumer yet

Worth stating plainly, because it was mis-stated earlier in this document. Eight types own a feed —
`Mailbox`, `Calendar`, `Chat`, `Transcript`, commerce `Search`, magazine `Subscription`, `Ibkr`,
`TriggerEvent` — and three of them (`Mailbox`, `Calendar`, magazine `Subscription`) declare it via
`FeedAnnotation`. But **none except `Mailbox` has a cursored consumer**: no `Cursor.makeFeed` or
`findOrCreateFeedCursor` appears in magazine, ibkr, assistant-toolkit or commerce, and nothing scans
the calendar feed.

Note the asymmetry this creates: the generic DISCOVERY of feed owners is already built and used
(`selectFeed`), while the generic CONSUMPTION of a feed is not. D6 is the second half of a pattern the
codebase has already started.

The plugin-projects trio was cited here as the existing second instance and is not one: all three read
`mailbox.feed`, so they need no generalization at all — what they need is fan-out. The nearest genuine
candidate is transcription, which owns its own `Feed`, but its `messageEnricher` runs BEFORE a message
is written — a write-time seam structurally closer to the sync half's inline stages than to a cursored
read-time pass.

So D6 was not "generalize for the second instance" — and in the end it was neither. What shipped is
not an abstraction over feeds at all: it is a correction to what identifies a cursor, which the
projects pipeline needed regardless of whether anything is ever generic. The generic host remains
unbuilt, and still has no second consumer asking for it.

**What is still mailbox-typed, deliberately.** `AnalyzeMailbox`'s input stays `Ref.Ref(Mailbox)` — it
is the operation users invoke directly, and it loses real boundary validation for nothing. So do its
progress key and `MailboxTier`. Generic-ness belongs at the PROCESSOR seam, where a pass declares its
own subject; the host's public boundary is not the same question, and conflating them is what made D6
look bigger than it was. See the D6 entry in [`TASKS.md`](TASKS.md).

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

1. **Give the remaining cursorless consumers a cursor** — mechanical now that a cursor is identified by
   `(feed, subject, tag)`, but each needs its own call on whether feed position or derived-state
   replacement is right. Settled so far: `syncProjectTasks` YES (2026-08-15, per-project);
   `ExtractSubscriptions`, `update-travel-log` and `update-investor-log` NO — all three regenerate
   derived state from the whole feed, so a cursor would corrupt what they produce.
2. **A feed-generic host** — the residue of D6 as originally framed. Still unbuilt and still without a
   second consumer asking for it; the cursor correction that D6 turned out to be did not require it.
