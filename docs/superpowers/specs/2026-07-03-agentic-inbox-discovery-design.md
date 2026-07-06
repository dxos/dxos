# Agentic Inbox — Email Discovery Pipeline Design

- **Date:** 2026-07-03
- **Status:** Draft (brainstorm output; pre-implementation)
- **Owner:** rich@braneframe.com
- **Related:** [`2026-06-27-semantic-index-design.md`](2026-06-27-semantic-index-design.md), [`2026-07-02-dxos-pipeline-design.md`](2026-07-02-dxos-pipeline-design.md), `@dxos/pipeline`, `@dxos/pipeline-email`, `@dxos/semantic-index`

## 1. Context & goal

`@dxos/pipeline-email` today is a worked example: a `Stream → Stage[] → Sink` run that summarizes emails, extracts contacts (`Person`/`Organization`), and tallies stats over the Enron corpus. This spec evolves it into an **agentic inbox**: online processing of mail that discovers structure across a corpus and _takes action_ — drafting and (permission-gated) sending responses, spawning research sub-agents, and maintaining a queryable knowledge graph.

The work is explicitly framed as **the next phase of the `@dxos/semantic-index` experiment**. semantic-index provides a fact-extraction engine (grounded, attributed, temporally-scoped, valence-scored triples with a SPARQL/NL query surface). Building the agentic inbox on top is the test of whether that fact model earns its keep. semantic-index is the substrate we build on and stress, not an abstract plug-in point.

### Non-goals (this phase)

- A production mail transport / IMAP-Gmail sync. We drive from the existing corpus source (parquet) and a `Message` stream; live ingestion is a later concern.
- A UI. Discovery and actions materialize as ECHO objects; rendering/approval UX is downstream.
- Replacing `@dxos/extractor` contact extraction wholesale — it remains valid; it becomes one producer feeding (and reconciling against) the fact graph.

### Success criteria

1. A layered pipeline (message → thread → corpus) produces, for the Enron corpus, a populated fact graph plus materialized ECHO entities (`Thread`, `Topic`, `ActionItem`, `ResearchTask`, `DraftResponse`).
2. The action layer can, for a given incoming message, decide **auto-respond vs propose vs abstain** using (a) fact **valence/confidence**, (b) resolved **capability** for the sender scope, and (c) whether required **access permissions** are held — and cite the supporting facts.
3. An agent (or the user) can query the inbox in SPARQL/NL ("what commitments do I owe Alice by Friday?").
4. The experiment yields a clear verdict on semantic-index's fitness: which discovery aspects are naturally facts, which are computed syntheses, and where the fact model is awkward.

## 2. Architecture — fact substrate + projections (Approach B)

Five layers. Layers decouple through the **graph** (fact store + ECHO), not through one long stream, so message/thread processing can run online while corpus synthesis runs periodically.

```
                        ┌─────────────────────────────────────────────┐
   incoming Message ──▶ │  1 MESSAGE layer  (per-message stages)      │
                        │    enrich → Message.properties              │
                        │    extract → Facts (semantic-index)         │
                        └───────────────┬─────────────────────────────┘
                                        │ facts + refs
                        ┌───────────────▼─────────────────────────────┐
                        │  2 THREAD layer  (windowed by threadId)     │
                        │    rolling summary, state machine,          │
                        │    consolidated Q/action items → Thread     │
                        └───────────────┬─────────────────────────────┘
                                        │
                        ┌───────────────▼─────────────────────────────┐
                        │  3 CORPUS layer  (periodic pass / query)    │
                        │    meta-thread clustering → Topic,          │
                        │    commitment ledger, relationship rollups, │
                        │    research agenda, briefings               │
                        └───────────────┬─────────────────────────────┘
                                        │  facts (valence + provenance)
                        ┌───────────────▼─────────────────────────────┐
                        │  4 ACTION layer                             │
                        │    draft, auto-respond?, tasks, research    │
                        │    sub-agent prompts, follow-ups, triage    │
                        └───────────────┬─────────────────────────────┘
                                        │ every action checks
                        ┌───────────────▼─────────────────────────────┐
                        │  5 CAPABILITY layer  (cross-cutting)        │
                        │    action perms + access perms,             │
                        │    scope resolution, autonomy tiers, audit  │
                        └─────────────────────────────────────────────┘

   substrate:  @dxos/semantic-index  (Fact graph: Assertion + Valence + Attribution + Entity;
                                      SemanticStore; SPARQL + nl-to-query)
```

**Production modes of a discovery aspect** — every aspect in the taxonomy (§3) is produced by exactly one of:

- **Extract** — an LLM extraction stage emits `Fact`s into the `SemanticStore` (subject–predicate–object + valence + attribution). Best for atomic propositions grounded in a span.
- **Compute** — deterministic derivation over facts/messages (no LLM, or LLM-assisted but rule-driven), materialized as an ECHO entity. Best for state machines, clustering, ledgers, tallies.
- **Query** — a SPARQL/NL query over the fact graph, evaluated on demand (not materialized, or cached). Best for user/agent questions and action-time grounding.

This classification is a first-class output of the experiment: it tells us where the fact model fits.

## 3. Discovery taxonomy

Each aspect is tagged with its production mode **[E]**xtract / **[C]**ompute / **[Q]**uery and its primary output.

### ① Message layer — per-message

| Aspect                                                                                | Mode | Output                                                     |
| ------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| Summary (existing)                                                                    | E/C  | `Message.properties.summary` + summary block               |
| Category/intent (request, FYI, scheduling, sales, newsletter, notification, personal) | E    | `Message.properties.category`                              |
| Priority/urgency, sentiment/tone, language                                            | E    | `Message.properties.*`                                     |
| Spam/phishing (existing)                                                              | E    | `Message.properties.spam`                                  |
| Questions posed to recipient                                                          | E    | `Fact` (predicate `asks`) + `Question` entity              |
| Action items / commitments / deadlines                                                | E    | `Fact` (`owes`/`dueBy`, temporal `validTo`) → `ActionItem` |
| Decisions / facts / claims stated                                                     | E    | `Fact`                                                     |
| Entities (people, orgs, dates, amounts, URLs, referenced docs)                        | E    | `Fact` + `Entity` (`ref` → ECHO)                           |
| Needs-response + response type (yes/no, schedule, info, approval)                     | E    | `Message.properties.needsResponse`                         |
| PII / confidentiality / legal-hold signals                                            | E    | `Message.properties.sensitivity`                           |
| Attachment needing sub-extraction (invoice, contract)                                 | C    | dispatch to extractor sub-pipeline                         |
| Sender/recipient/mention resolution to `Person`/`Organization`                        | C    | `Entity.ref` (reconcile)                                   |

### ② Thread layer — grouped by `threadId` (windowed)

| Aspect                                                                     | Mode | Output                                  |
| -------------------------------------------------------------------------- | ---- | --------------------------------------- |
| Rolling thread summary                                                     | E/C  | `Thread.summary`                        |
| Thread state (open / awaiting-mine / awaiting-theirs / resolved / stalled) | C    | `Thread.state`                          |
| Consolidated open questions & action items (mark answered)                 | C    | `Thread` ⇄ `Question`/`ActionItem` refs |
| Decision log / outcome                                                     | C    | `Thread.decisions`                      |
| Participants & who-owes-whom; relationship/sentiment trajectory            | C    | `Thread.participants`                   |
| Staleness / SLA → follow-up-nudge candidate                                | C    | `Thread.followUpDue`                    |
| Next-best-action (reply / schedule / task / escalate / archive)            | C    | `Thread.nextAction`                     |

### ③ Corpus / meta layer — cross-thread (periodic pass or query)

| Aspect                                                               | Mode | Output                                              |
| -------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| Meta-threads: cluster related conversations → project/topic          | C    | `Topic` (refs `Thread`s)                            |
| Commitment ledger (owe / owed, across threads)                       | Q/C  | query over `owes`/`dueBy` facts → `Topic`/dashboard |
| Relationship rollups (cadence, responsiveness, last-contact, topics) | C    | enrich `Person`/`Organization`                      |
| Research agenda (recurring unknowns)                                 | C    | `ResearchTask`                                      |
| Recurring patterns (subscriptions, periodic reports)                 | C    | `Message.properties` / rules                        |
| Timeline / briefings ("what changed this week with X")               | Q    | on-demand query                                     |
| Priority/anomaly detection (VIP waiting, deadline near)              | Q/C  | surfaced to action layer                            |
| Reusable-answer mining (canonical snippets from sent mail)           | E/C  | corpus for draft grounding                          |

### ④ Action layer — driven by ①–③, gated by ⑤

| Aspect                                                       | Mode | Output                                    |
| ------------------------------------------------------------ | ---- | ----------------------------------------- |
| Draft response (grounded in thread + facts + prior style)    | E    | `DraftResponse` (pending)                 |
| Auto-respond decision                                        | C    | send \| propose \| abstain (see §6)       |
| AccessRequest when a draft needs unheld data (e.g. Calendar) | C    | `AccessRequest` (pending)                 |
| Suggested tasks / calendar events / reminders                | C    | pending ECHO objects                      |
| Research sub-agent prompt + context bundle                   | E/Q  | `ResearchTask` w/ prompt + fact citations |
| Follow-up nudge for stalled threads                          | E    | `DraftResponse` (nudge)                   |
| Triage / routing (label, prioritize, snooze)                 | C    | `Message.properties`                      |

## 4. Data model

Two graphs bridged by DXN refs, with a clear canonicality rule.

> **ECHO is canonical. The fact graph is tentative and advisory.** Extracted facts are
> conflict-prone, their accuracy depends on context and sender, and they go stale quickly.
> They are an _evidence/signal_ layer that informs discovery and grounds actions (via valence +
> provenance) — they never govern truth. Materialized ECHO entities (`Thread`, `ActionItem`, …)
> are authoritative objects the user and app own; a fact may _suggest_ creating or updating one,
> but the entity is not a mechanically-rebuilt projection of the fact graph. When they disagree,
> ECHO wins. (This is also the honest test of semantic-index: does an advisory fact layer earn
> its keep given ECHO already holds canonical state?)

### 4.1 Fact graph (`@dxos/semantic-index`) — tentative evidence layer

`Fact = { id, Assertion(subject, predicate, object, validFrom?, validTo?, quote?), Valence(factuality, polarity, confidence, nature?), Attribution(source, agent, generatedAtTime, wasDerivedFrom?, span?), Entity[] (ref? → ECHO), recordedAt, extractor, sourceHash }`. `source` = the `Message` DXN. Append-only, incremental via `sourceHash`/cursor. Treated as advisory: used for grounding/confidence and query, not as the system of record.

### 4.2 Message metadata (`@dxos/types` `Message.properties`)

Cheap per-message scalars/labels for fast filtering without a graph query: `category`, `priority`, `sentiment`, `language`, `spam`, `sensitivity`, `needsResponse`, `responseType`, plus refs to extracted `Question`/`ActionItem` entities. (Note: `Message` schema is owned by `@dxos/types`; new fields land there or in a typed `properties` sub-schema.)

### 4.3 New ECHO entity types (canonical objects)

Home: `packages/core/compute/pipeline-email/src/types` for now (co-located with the pipeline; promote to a dedicated schema module later if consumers outside the pipeline need them).

- `Thread { threadId, subject, summary, state, participants[], openQuestions[]→Question, actionItems[]→ActionItem, decisions[], nextAction, followUpDue?, messages[]→Message }`
- `Topic` (meta-thread) `{ label, summary, threads[]→Thread, entities[]→Person/Org, timeline }`
- `Question { text, askedBy→Person, inMessage→Message, answered?, answerFact? }`
- `ActionItem { text, owner→Person, dueBy?, source→Message, status, derivedFrom→Fact? }`
- `ResearchTask { prompt, context (fact citations), status, result?, spawnedAgent? }`
- `DraftResponse { inReplyTo→Message/Thread, body, groundedIn→Fact[], confidence, status: draft|proposed|approved|sent|rejected }`
- `AccessRequest { agent, scope, resource (e.g. Calendar DXN), reason, status: pending|granted|denied }`
- `PermissionConfig` (see §5)

These are authoritative (§4 canonicality rule). A `Fact` may cite via `derivedFrom`/`groundedIn` as supporting evidence, but the entity's state is owned in ECHO, not recomputed from facts. Refs use DXN throughout, mirroring `Entity.ref` and `extract-contact`, so a fact's `Entity.ref` can point at the canonical ECHO object.

## 5. Capability & permission model (cross-cutting)

Two **distinct** permission kinds:

- **Action permissions** — what the agent may _do_: `summarize`, `extract`, `createTask`, `draftResponse`, `sendResponse`, `spawnResearch`, `scheduleEvent`, …
- **Access permissions** — what data the agent may _read_ to perform an action: `calendar`, `contacts`, `space:<dxn>`, `thread-history`, `external:<domain>`, …

### 5.1 Scoped configuration & resolution

`PermissionConfig` exists at three scopes with **most-specific-wins** precedence:

```
mailbox (global default)  ◀── overridden by ──  Organization  ◀── overridden by ──  Person
```

`PermissionConfig { scope: mailbox|org|person, subject?→Org/Person, autonomyTier, grantedActions[], grantedAccess[], constraints? }`.

### 5.2 Autonomy tiers (graduated authority)

`observe → suggest → draft → act-with-confirm → act-autonomously`. A scope's tier caps what the action layer may do there; authority **accumulates over time** — the user promotes a sender/org up the ladder as trust is established.

### 5.3 Access requests (earning authority)

When an action needs data it lacks permission for, the agent emits an `AccessRequest` rather than proceeding. The user grants (or denies); a grant appends to the relevant `PermissionConfig.grantedAccess`. This is how the agent _requests_ new capabilities and gradually accumulates them.

### 5.4 Enforcement point & audit

A single `CapabilityResolver` service is consulted **before any action stage** runs:

```
resolve(action, senderScope, requiredAccess[]) → Allow | DegradeToProposal | Deny
```

Inputs: resolved `PermissionConfig` (tier + grants) for the scope, the set of `requiredAccess` the action declares, and the **confidence/valence** of the facts grounding the action (§6). Every action records what it did and the capabilities + facts it relied on (audit trail; also the provenance shown to the user).

## 6. Trust — valence & provenance gate autonomy

The auto-respond (and any high-risk action) decision is a function of three independent signals:

1. **Grounding confidence** — the draft's supporting `Fact`s' valence: `CT+` (certain) high, `PR+`/`PS+` progressively lower; aggregate confidence must clear a threshold.
2. **Capability** — `CapabilityResolver` verdict for `sendResponse` at the sender's scope.
3. **Access** — all `requiredAccess` for the response are held (else emit `AccessRequest`).

Decision:

```
if capability == Deny                       → abstain
elif capability == DegradeToProposal
     or confidence < θ_send
     or missing requiredAccess              → propose (DraftResponse: proposed) [+ AccessRequest if access-blocked]
else                                         → send (DraftResponse: sent), cite groundedIn facts
```

Every `DraftResponse` carries `groundedIn: Fact[]` so a human (or auditor) can trace _why_ the agent said what it said back to message spans.

## 7. Package & code structure

- `@dxos/pipeline-email` (existing) — grows the message/thread/corpus **stages** and the Enron test harness. Depends on `@dxos/semantic-index`.
- Discovery stages are `Stage<In, Out, Ctx, E>` values; thread grouping uses `Stage.window` keyed by `threadId`; corpus synthesis is a separate pass/effect over the `SemanticStore` + ECHO.
- ECHO entity types (§4.3) and `PermissionConfig` live in `pipeline-email/src/types` for now.
- `CapabilityResolver` as an Effect service (Context.Tag + Layer), test-parametrizable.
- Reuse `@dxos/extractor-lib` `extractContact` as one message-layer producer that reconciles into `Entity.ref`.

## 8. Testing strategy

- Extend the existing env-gated Enron suite (`ROOT_DIR` + Ollama) rather than adding fragmented suites; add cheap non-gated unit tests for each **compute** stage (state machine, clustering, ledger, capability resolution) using scripted `Message`/`Fact` fixtures — no LLM.
- Use **memoized LLM** fixtures (see `regenerate-memoized-llm`) for extract-stage determinism where feasible.
- Use `TestClock` for staleness/SLA and temporal-validity logic; avoid sleeps.
- `CapabilityResolver` gets a dedicated table-driven test over (tier × action × access × confidence) → verdict.
- One integration test asserting the end-to-end auto-respond/propose/abstain decision for representative senders.

## 9. Phasing

Full taxonomy is specced; implementation proceeds in slices, each independently testable:

1. **Fact substrate wiring** — run the message stream through semantic-index extraction (email-tuned rules); reconcile entities to `Person`/`Organization`. Verdict input: which ① aspects are naturally facts.
2. **Thread layer** — `Stage.window` by `threadId`; `Thread` entity with summary + state machine + consolidated Q/action items.
3. **Corpus layer** — meta-thread clustering → `Topic`; commitment ledger via SPARQL; relationship rollups.
4. **Capability model** — `PermissionConfig` scopes, `CapabilityResolver`, `AccessRequest` flow, audit.
5. **Action layer** — `DraftResponse` grounded in facts; auto-respond/propose/abstain decision (§6); `ResearchTask` + sub-agent prompt.

## 10. Decisions & open questions

**Resolved**

1. **Entity home** — ✅ Keep the new ECHO types in `pipeline-email/src/types` for now; promote to a dedicated schema module only if outside consumers appear.
2. **Fact vs entity canonicality** — ✅ **ECHO is canonical; the fact graph is tentative/advisory** (§4). Entities are authoritative objects, not mechanically-rebuilt projections. Facts are conflict-prone, context/sender-dependent, and go stale; they inform and ground but never govern. When they disagree, ECHO wins.
3. **Meta-thread clustering method** — ✅ Deferred to a slice-3 spike (embedding similarity vs shared-entity graph vs LLM grouping vs hybrid); no method locked now.

**Open**

4. **Message schema ownership** — new per-message fields on `@dxos/types` `Message` vs a typed `properties` sub-schema; coordinate with `@dxos/types` owners.
5. **Online vs batch corpus pass** — corpus synthesis cadence (scheduled vs triggered by thread-state changes).
6. **semantic-index gaps** — append-only model appends competing facts on source change (supersession deferred). Given facts are advisory and ECHO canonical (§4), staleness is tolerable, but thread/commitment grounding may still want supersession or recency-weighting; may feed back into the semantic-index experiment.
