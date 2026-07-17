# @dxos/pipeline-email — Design

Agentic-inbox discovery over an email corpus, built on `@dxos/pipeline` (streaming stages) and
`@dxos/pipeline-rdf` (advisory fact graph). Master spec:
[`agents/superpowers/specs/2026-07-03-agentic-inbox-discovery-design.md`](../../../../agents/superpowers/specs/2026-07-03-agentic-inbox-discovery-design.md).

**Canonicality rule (spec §4):** ECHO objects are canonical; the fact graph is tentative, advisory
evidence (conflict-prone, sender/context-dependent, goes stale). Facts inform and ground decisions —
they never govern. When they disagree, ECHO wins.

## Built (phases 1–3)

```
Message stream ──▶ ① message stages: summarize · extractFactsStage(indexFacts) · extract-contact · stats
                        │                            └─▶ Facts → SemanticStore (advisory)
                        ▼ captured messages
                   ② thread layer (post-stream): deriveThreadId → buildThreads → Thread (ECHO)
                        ▼
                   ③ corpus layer: clusterThreads → TopicDraft ─ summarizeTopics (LLM, degradable)
                        ├─ materializeTopics → Topic (ECHO)
                        ├─ commitmentLedger(SemanticStore) → Commitment[] (advisory, fact-grounded)
                        ├─ buildRollups(messages) → RelationshipRollup[] (values; Person is closed/canonical)
                        └─ buildDigest → skeleton ─ narrateDigest (LLM, degradable) — Query-mode, not materialized
```

**Configurability:** every algorithm takes an options bag with exported defaults —
`ExtractOptions.rules/model/provider` (extraction), `TopicOptions` (clustering thresholds,
stopwords), `LedgerOptions.predicates`, `DigestOptions`; all LLM prompts are user-editable via
`EmailPrompts` / `mergePrompts` (`prompts.ts`). LLM calls cross module boundaries only as plain
closures (`FactIndexer`, `Summarizer`) so modules stay `R = never` and every LLM step degrades
gracefully (empty summary / no facts / skeleton-only digest).

## Phase 4 — Capability layer (design)

Two distinct permission kinds, resolved before any action runs:

- **Action permissions** — what the agent may _do_: `summarize`, `extract`, `createTask`,
  `draftResponse`, `sendResponse`, `spawnResearch`, `scheduleEvent`, …
- **Access permissions** — what data the agent may _read_ to do it: `calendar`, `contacts`,
  `space:<dxn>`, `thread-history`, `external:<domain>`, …

**`PermissionConfig`** (ECHO type, this package): `{ scope: mailbox|org|person, subject?→Org/Person,
autonomyTier, grantedActions[], grantedAccess[], constraints? }` at three scopes with
most-specific-wins precedence: `mailbox ◀ org ◀ person`.

**Autonomy tiers** (graduated authority): `observe → suggest → draft → act-with-confirm →
act-autonomously`. A scope's tier caps the action layer there; the user promotes senders/orgs as
trust accumulates.

**`CapabilityResolver`** — one enforcement point, an Effect service (`Context.Tag` + `Layer`,
test-parametrizable):

```
resolve(action, senderScope, requiredAccess[]) → Allow | DegradeToProposal | Deny
```

Inputs: the resolved `PermissionConfig` chain, the action's declared `requiredAccess`, and the
grounding confidence of the supporting facts (valence: `CT+` high → `PS` low). Every decision is
recorded with the capabilities + fact ids relied on (audit trail = the provenance shown to the user).

**`AccessRequest`** (ECHO, pending): emitted when an action needs unheld access instead of
proceeding; a grant appends to the relevant `PermissionConfig.grantedAccess` — how the agent _earns_
authority over time.

## Phase 5 — Action layer (design)

All actions are gated by the capability layer and grounded in the corpus outputs:

- **`DraftResponse`** (ECHO, `{ inReplyTo, body, groundedIn: factIds[], confidence, status:
draft|proposed|approved|sent|rejected }`) — drafted from thread + facts + prior style; every draft
  cites its supporting facts so a human can trace _why_.
- **Auto-respond decision** — three independent signals:
  1. grounding confidence of supporting facts clears a threshold (`CT+` weighted),
  2. `CapabilityResolver` verdict for `sendResponse` at the sender scope,
  3. all `requiredAccess` held (else emit `AccessRequest`).
  ```
  Deny → abstain;   DegradeToProposal | low confidence | missing access → propose;   else → send
  ```
- **`ResearchTask`** (ECHO): recurring unknowns from the corpus become sub-agent prompts bundled
  with fact citations; the follow-up nudge for stalled threads (from `Digest.stalledThreads`) is a
  `DraftResponse` variant.
- Suggested tasks / calendar events / triage labels materialize as pending ECHO objects awaiting
  approval, per the autonomy tier.

## Integration notes — plugin-crm / plugin-inbox / assistant-e2e (reconciled 2026-07-04)

Verified against `plugin-crm`, `plugin-inbox`, and `assistant-e2e` (`crm-mailbox.test.ts`):

- **No coupling or collisions today.** Nothing imports `@dxos/pipeline-email`; the typenames
  `org.dxos.type.emailThread` / `org.dxos.type.emailTopic` are unique (`org.dxos.type.thread` is the
  unrelated chat Thread; `org.dxos.type.mailbox` is `plugin-inbox`'s container). Registering these
  types does not affect the e2e harness — `agentTest` only registers types a test lists explicitly,
  so `crm-mailbox.test.ts` and its memoized LLM fixture are untouched.
- **Shared data model.** All parties speak `@dxos/types` `Message` (`properties.subject`,
  `threadId?`) and canonical `Person`/`Organization` — `plugin-crm`'s fixtures build exactly the
  `Message.make({ sender, blocks, properties: { subject } })` shape this package's
  `deriveThreadId`/`buildThreads`/`buildRollups` consume, so the corpus layer can run over a CRM
  mailbox unchanged. `plugin-crm`'s `ProfileOf.summary` (profile text) is unrelated to email
  summaries.
- **Convergence to resolve when a plugin adopts this package** (tracked, not blocking):
  1. Per-message summaries: `plugin-inbox`'s `summarize-extractor` writes a separate
     `Markdown.Document`; this package writes `Message.properties.summary`. Pick one pattern (the
     properties field feeds `buildThreads`/topic summaries directly; the extractor convention suits
     UI documents) or bridge them in the extractor.
  2. Spam: `plugin-inbox`'s `MessageState.SPAM` is an unused placeholder; this package sets
     `Message.properties.spam` — a natural producer for that state.
  3. Surfaces: `Thread.state` (awaiting-mine/stalled) → mailbox triage; rollups → contact panels;
     `Topic`/digest → briefing views. Requires promoting the types out of package-internal scope.
- **e2e gating differs by design:** `crm-mailbox.test.ts` replays memoized conversations in normal
  CI; this package's Enron test is env-gated (`ROOT_DIR` + Ollama). Both suites pass alongside this
  package's changes (verified in the phase-3 run).
- Known gap: a transient unhandled rejection escaping the real-Ollama extraction path under the
  gated Enron test (assertions pass; investigation in `agents/superpowers` ledger; deferred, CI-safe).
