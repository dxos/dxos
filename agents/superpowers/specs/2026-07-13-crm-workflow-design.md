# Topic-Anchored AI CRM — Product Design

_Date: 2026-07-13 · Project: mailbox-research · Status: draft for morning refinement_

## Vision

A new kind of CRM: an **AI-assisted workflow engine** that analyzes personal and team email, discovers
**Topics**, and drives custom workflows anchored off those topics. Unlike a contact database you fill in
by hand, the system _reads the mail_ — extracting contacts, topics, tasks, and facts — and keeps a
living, local-first (ECHO) knowledge base that powers triage, drafting, research, and meeting support.

**The Topic is the organizing primitive.** A Topic clusters related threads/messages and carries: a
status summary, participants (→ contacts), action items (→ tasks), facts (→ knowledge), and draft
responses. Everything else hangs off Topics: contacts are the participants, tasks are the open items,
research and meeting prep are topic-scoped. This is the through-line the mailbox-research experiments
have been validating (`Topic` schema, suggestions, the Active Topics experiment).

## Principles

- **Local-first & private** — data lives in ECHO; LLM cost is batchable background enrichment, sync is
  deterministic and fast (the two-tier latency model).
- **Provenance everywhere** — every extracted fact/task/contact cites its source message(s); nothing is
  asserted without a traceable origin (mitigates LLM hallucination).
- **Human-in-the-loop** — the system _proposes_ (suggested topics, draft replies, extracted tasks); the
  user accepts/edits. Confidence + rationale are always surfaced.
- **Model routing** — cheap/local models for extraction/labeling, premier models only where they pay off
  (the `model-policy` map; REPORT §4/§5 findings).
- **Composable ECHO objects** — `Person`, `Organization`, `Topic`, `Outline` (tasks), `Message`/`Thread`,
  facts; related via ECHO relations (`AnchoredTo`, `ExtractedFrom`, etc.).

## Architecture (layers)

1. **Ingest** (deterministic, foreground) — Gmail/JMAP sync → `Message` feed; dedup; sync filters.
2. **Triage** (fast, cheap) — sender classification (person/org), bulk/spam tagging, replyability.
3. **Enrichment** (batched, background) — per-message: summary/label, tags, salient facts (one LLM pass —
   `enrich.ts`); the structured RDF fact pipeline runs separately.
4. **Corpus/Topics** (deterministic + LLM) — thread building, clustering, topic suggestions, active-topic
   ranking + population (status/tasks/facts/drafts).
5. **Knowledge** — `Person`/`Organization` cards, the fact store (contextual memory), the relationship graph.
6. **Workflows** — topic-anchored, user-defined automations (draft, research, meeting prep, custom).
7. **Surfaces** (plugin-inbox + siblings) — mailbox, topics master/detail, contact cards, task views,
   companion panels.

## Features

Each feature: **what** · **data/pipeline** · **surface** · **tests**. Items marked ✅ shipped, 🔬 have a
research probe, 🆕 are proposed-new.

### 1. Contact management — Person + Organization cards

- **What:** maintain `Person` and `Organization` records extracted from mail + enriched; each card shows
  role, org, recent topics, open items, last contact, and relationship strength.
- **Data/pipeline:** `Person`/`Organization` (already in `@dxos/types`); contact extraction exists
  (`contact-extractor`). Add **entity resolution** (dedup aliases/emails → one Person; the multi-alias
  work in `buildThreads` is a first step) and **relationship edges** (Person↔Organization, Person↔Topic).
  Enrichment: infer role/org from signatures + thread context; optionally external enrichment (opt-in).
- **Surface:** Contact card (Form + schema); "related topics/tasks/threads" sections; a directory view.
- **Tests:** entity-resolution precision/recall on the private corpus (alias merge); role/org inference
  accuracy vs a small gold set; dedup stability across re-syncs.

### 2. Topic discovery & summarization ✅🔬

- **What:** cluster threads into Topics with labels + status summaries; propose _suggested_ topics
  (opt-in) and rank _active_ topics.
- **Data/pipeline:** shipped — `topics-pipeline` (tag → cluster → summarize), `Mailbox.topicSuggestions`
  (Accept/Dismiss), bulk-suppression + person-ranking. 🔬 the **Active Topics** experiment adds activity
  scoring, LLM confidence, and full population (status/facts/tasks/drafts).
- **Surface:** shipped — `TopicsArticle` (master + Suggested section), `TopicArticle` (detail).
- **Tests:** clustering agreement vs a reference; suggestion precision (are suggested topics real?);
  active-topic ranking vs human judgement (the experiment); label quality (LLM vs keyword).

### 3. Task extraction & management

- **What:** extract action items from threads/topics; manage them (status, due date, assignee, links to
  the topic + contact); a cross-topic task inbox.
- **Data/pipeline:** action items → plugin-outliner `Outline` (nested `- [ ]`) — validated in the Active
  Topics experiment. Add **due-date/owner extraction**, **completion tracking**, and **dedup** across
  re-runs. Tasks relate to their Topic and the responsible Person.
- **Surface:** per-topic task outline (in `TopicArticle`); a global task view; inline check-off.
- **Tests:** action-item extraction precision/recall vs gold; due-date parsing accuracy; no-duplicate on
  re-extraction; round-trip through the Outline structure.

### 4. Automated drafts & question answering ✅🔬

- **What:** draft replies to replyable (person) threads; answer questions grounded in the user's own
  knowledge (facts + threads), e.g. "what did I tell Alice about pricing?"
- **Data/pipeline:** drafting shipped (`draft.ts` + `DEFAULT_DRAFT_INSTRUCTIONS`; skips bulk/automated).
  QA 🔬 = the `plugin-brain` skill (SummarizeSubject/QueryFacts) + FactStore retrieval — **usefulness of
  the fact store for QA is the open question** (see ROADMAP).
- **Surface:** inline reply drafts (shipped in the threaded view); a QA/ask companion.
- **Tests:** draft rubric (relevance/correctness/completeness/tone — REPORT §4); QA faithfulness +
  answer accuracy vs held-out threads; fact-grounded vs raw-thread QA (the FactStore validation).

### 5. Automated research (topic subject matter) 🆕

- **What:** for a topic, run background research on its subject (companies, people, products, terms) and
  attach a cited findings note.
- **Data/pipeline:** a research agent (web search + fetch) scoped to the topic's entities/keywords;
  outputs a `Markdown.Document` (or Topic `research` field) with citations; gated (opt-in, cost-aware).
- **Surface:** a "Research" section/companion on the Topic; refresh control.
- **Tests:** citation validity (do sources support claims?); relevance to the topic; latency/cost budget;
  no-hallucination check on the findings note.

### 6. Meeting prep (topic participants) 🆕

- **What:** before a meeting, assemble a brief for the participants: who they are (contact cards), the
  active topics you share, open items/questions, recent threads, and relevant research.
- **Data/pipeline:** join Calendar events (`Event`) ↔ participants (`Person`) ↔ topics; compose a brief
  from existing topic/contact/task data + optional research. Reuses calendar sync (already in plugin-inbox).
- **Surface:** a meeting-prep card keyed off a calendar event; "topics with these participants".
- **Tests:** participant→contact resolution; topic relevance to the meeting; brief completeness vs a human
  checklist; freshness (no stale status).

### 7. Meeting transcription (live extraction + background research) 🆕🔬

- **What:** transcribe a live meeting; extract entities/tasks/decisions in real time; run background
  research on surfaced subjects; fold outputs back into the relevant Topic.
- **Data/pipeline:** the `@dxos/transcription-pipeline` (PipelineRuntime + correction/extraction/
  summarization stages — draft PR #11990) is the substrate; wire live extraction → Topic/tasks/facts and
  trigger the research agent (#5) on new subjects.
- **Surface:** a live transcript panel with a running extraction sidebar; post-meeting summary attached to
  the Topic.
- **Tests:** transcription correction quality; live-extraction latency; extraction precision vs the final
  transcript; correct topic attribution.

## Proposed additional features

- **8. Workflow engine (🆕, the "custom workflows" core):** user-defined, topic-anchored automations —
  triggers (topic becomes active / new message on a topic / task overdue / meeting scheduled) → actions
  (draft, research, notify, create task, update status). A small rules layer; **N3/RDF rules are a
  candidate implementation** (see ROADMAP — validate before committing). This is what makes it a _CRM
  workflow engine_ rather than a viewer.
- **9. Triage inbox & two-tier latency (🔬):** foreground = deterministic sync + classify + tag (fast);
  background = prioritized batched enrichment (summarize/facts/draft), gated by labels. Already scoped in
  TASKS (§5). The user-facing payoff is an inbox that's instantly usable while intelligence fills in.
- **10. Relationship graph & warm intros (🆕):** Person↔Person edges from co-participation; surface
  connection paths and "who knows X".
- **11. Provenance & trust layer (🆕):** every fact/task/contact links to source `Message` DXNs; a
  "why do you believe this?" affordance. Directly mitigates the hallucination risk the research flags.
- **12. Team mode (🆕):** shared Topics/contacts across a team space (ECHO spaces); per-user vs shared
  visibility.
- **13. Digest & notifications (🆕):** a daily/edge-triggered digest of active topics, due tasks, and
  drafts awaiting approval.

## Cross-cutting concerns

- **Evaluation harness** — extend the `stories-brain` harness so every feature has a private-corpus eval
  (the model-ladder + Active Topics patterns generalize): extraction P/R, faithfulness, ranking quality,
  latency/cost. Human-review artifacts under `fixtures/local/results/`.
- **Model routing** — promote/extend the `model-policy` map to cover the new LLM stages (research, QA,
  meeting extraction).
- **FactStore** — the contextual-memory layer; its value for QA/contextualizing new mail is **not yet
  validated** — the ROADMAP defines the experiments that decide whether it stays.

## Open questions (for morning refinement)

- Does the **FactStore / RDF layer** earn its place, or is thread-grounded RAG enough? (ROADMAP probes.)
- Should the **workflow engine** be N3 rules, a small TS state machine, or LLM-planned? (validate.)
- How much **external enrichment** (vs. mail-only) do we want, given the privacy principle?
- Team mode: how do shared vs personal Topics reconcile?
