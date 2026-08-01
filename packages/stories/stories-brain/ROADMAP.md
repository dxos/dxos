# Mailbox Research — Roadmap

_Date: 2026-07-13 · draft for morning refinement. Companion to `fixtures/REPORT.md` (findings) and
`agents/superpowers/specs/2026-07-13-crm-workflow-design.md` (product vision)._

This roadmap sets research direction for the Topic-anchored AI CRM. It has three parts: **(A)** a
technique survey with background research, **(B)** the open **FactStore / RDF** question and concrete
validation experiments, and **(C)** a parallelizable experiment roadmap — self-contained briefs each
runnable by a separate agent.

## Where we are

- **Shipped (product):** sender triage, bulk/person tagging, topic clustering, opt-in topic suggestions,
  `TopicArticle`/`TopicsArticle` master-detail, create-topic-from-message, inline reply drafts.
- **Research (harness):** the model-ladder (open-weight vs haiku), and the Active Topics experiment —
  which now produces good active/suggested splits after the automated-sender down-weight (REPORT §6).
- **Not yet validated:** whether the **FactStore / RDF layer** earns its place, whether **N3 rules** are
  the right workflow substrate, and how much **contact/entity resolution** improves ranking.

## Part A — Technique survey

### A1. RDF / N3 rules & reasoning

Notation3 (N3) extends RDF with rules (`=>` forward-chaining, `<=` backward) and quantification, so a
reasoner can infer new triples from a knowledge graph — "if-then" over facts. The **EYE** reasoner is
the mature engine; 2025 work compares it with existential-rule reasoners (EYE excels with many
dependent rules; existential-rule engines with fact-abundant scenarios). Relevance: our extracted
email facts (`pipeline-rdf`) are RDF triples; N3 rules could drive **workflow triggers** ("a Topic with
an unanswered question from a known contact and an approaching date → needs-reply") and **derived
facts** (owes/awaits relations) declaratively instead of in TypeScript.

- Sources: [notation3.org](https://notation3.org/), [Semantic Web Reasoning with N3](https://n3.restdesc.org/), [N3 as an Existential Rule Language (2023)](https://iccl.inf.tu-dresden.de/w/images/4/49/RR23-N3Rules.pdf), [Inference rules for RDF(S)/OWL in N3Logic](https://arxiv.org/pdf/1601.02650).

### A2. Knowledge-graph (Graph)RAG vs vector RAG

2025 benchmarks: GraphRAG substantially beats vector-only RAG on **multi-entity, multi-hop, schema-bound**
queries (Diffbot's KG-LM benchmark ~3.4×; FalkorDB reports 90%+ vs ~56%). Vector RAG degrades toward 0%
as entities-per-query grow past ~5, while graph retrieval stays stable. But it's not a clean win —
head-to-head, vanilla RAG takes single-hop/detail questions; **hybrid** (vector for broad recall, graph
for relationship verification) gains 15–25%. Relevance: our QA use case ("what did I tell Alice about
pricing?") is often single-hop over a sender's threads (favors thread-RAG), but cross-topic/relationship
questions ("who owes me what?") are multi-hop (favors the fact graph). This tension is exactly what the
FactStore experiments (Part B) must resolve.

- Sources: [FalkorDB: GraphRAG accuracy benchmark](https://www.falkordb.com/blog/graphrag-accuracy-diffbot-falkordb/), [Fluree: when KGs outperform semantic search](https://flur.ee/blog/graphrag-vs-vector-rag-when-knowledge-graphs-outperform-semantic-search), [Atlan: Knowledge Graph vs RAG (2026)](https://atlan.com/know/knowledge-graphs-vs-rag-for-ai/).

### A3. LLM triple extraction — faithfulness & hallucination

Extracting (subject, predicate, object[, time]) with an LLM risks spurious/hallucinated triples.
KG-grounded hallucination frameworks (**GraphEval**) score each triple against its source context and
flag inconsistencies — a ready-made pattern for validating our extracted facts. Temporal KG extraction
(quadruples with timestamps) captures validity-over-time, relevant to "current status" of a Topic.
Takeaway: any fact layer needs a **per-triple faithfulness gate** (does the source support it?) and
**provenance** — which aligns with the CRM spec's provenance principle.

- Sources: [GraphEval (arXiv 2407.10793)](https://arxiv.org/abs/2407.10793), [KG-LLM papers list](https://github.com/zjukg/KG-LLM-Papers).

### A4. Relationship-intelligence CRM patterns

Commercial relationship-intelligence CRMs (Introhive, Clay, Sybill, ZoomInfo) auto-capture contacts
from mail/meetings, enrich profiles, map relationships, and score leads — validating the market shape of
our vision. Differentiators we can own: **local-first/private** (ECHO, no data exfiltration), **Topic-
anchored workflows** (vs. record-centric), and **provenance** (every enrichment cites a source).

- Sources: [Introhive: relationship intelligence](https://www.introhive.com/blog-posts/relationship-intelligence-automation/), [Sybill: CRM enrichment tools](https://www.sybill.ai/blogs/the-best-crm-data-enrichment-tools).

## Part B — The FactStore question (open)

**We have not validated that the FactStore / RDF layer is worth its complexity.** It may be that
thread-grounded retrieval (send the model the relevant threads) matches or beats structured facts for
our questions, at far lower cost. Decide it with experiments, not intuition:

- **B1. Fact-grounded vs thread-grounded QA (the decisive test).** Build a held-out QA set over the
  private corpus (questions with answers evidenced in specific messages). Compare three answerers:
  (a) raw-thread RAG (retrieve top-k threads by embedding), (b) fact-store retrieval (facts about the
  entities in the question), (c) hybrid. Score answer accuracy + faithfulness (LLM judge + human spot-
  check) and cost/latency. **Kill the FactStore if it doesn't beat thread-RAG on some question class.**
- **B2. Multi-hop / relationship questions.** Where A2 predicts graphs win: "who owes me a reply?",
  "which topics involve both X and Y?", "what's outstanding with the Kirk account?". Measure whether the
  fact graph answers these that thread-RAG cannot.
- **B3. N3 rules over facts.** Encode a few workflow rules in N3 (run via EYE or an N3.js engine) —
  e.g. derive `needs-reply` / `overdue` from extracted facts + thread state — and check the derived set
  vs a hand-labeled set. Decides whether N3 is a viable workflow substrate (vs TS rules).
- **B4. Per-triple faithfulness gate.** Apply a GraphEval-style check to the extracted facts on the
  corpus; measure hallucination rate by model (ties into the model-ladder). Gate low-confidence facts.
- **B5. Facts as memory for incoming mail.** The held-out-time split: build facts from older mail, test
  whether they correctly contextualize newer messages (the `facts = memory for new mail` thesis).

Each B-experiment plugs into the existing harness (fixture loader, model-policy, judge, results/\*.md).

## Part C — Experimental roadmap (parallelizable agent briefs)

Independent briefs — each self-contained enough to hand to a separate agent. Format: **Goal ·
Method/harness · Success metric · Deps.** Ordered roughly by leverage; most have no cross-dependencies.

- **C1. FactStore validation (B1+B2).** _Goal:_ decide if the fact layer beats thread-RAG. _Method:_
  new `fact-vs-thread-qa.bench.test.ts` + a held-out QA gold set (bootstrap with the strong model, human
  review). Three answerers, LLM-judge + human spot-check. _Metric:_ accuracy/faithfulness/cost per
  question class. _Deps:_ none (uses existing FactStore + embeddings).
- **C2. Active Topics v2 — LLM labels + contact-linked ranking.** _Goal:_ fix the two remaining warts
  (keyword-salad labels; person signal off). _Method:_ add a cheap LLM label pass for active topics;
  wire `personEmails` from extracted contacts so `personLinked` fires; re-run + compare rankings.
  _Metric:_ human review of top-N vs the current run. _Deps:_ contact extraction (C4).
- **C3. N3 workflow rules (B3).** _Goal:_ evaluate N3 as the workflow-trigger substrate. _Method:_
  encode ~5 rules (needs-reply, overdue, meeting-prep-due), run EYE/N3.js over extracted facts + thread
  state, compare derived set to a hand-labeled set. _Metric:_ precision/recall of derived triggers.
  _Deps:_ FactStore (facts available).
- **C4. Contact entity-resolution.** _Goal:_ merge aliases/emails into canonical `Person`s + link to
  `Organization`. _Method:_ dedup heuristics + LLM adjudication on ambiguous pairs; gold set from the
  corpus. _Metric:_ merge precision/recall; dedup stability across re-syncs. _Deps:_ none.
- **C5. Task extraction quality.** _Goal:_ measure action-item extraction (the Active Topics `tasks`
  stage) vs a gold set; add due-date/owner parsing + dedup. _Metric:_ P/R, due-date accuracy, no-dupe on
  re-run. _Deps:_ none.
- **C6. Draft quality re-score on the private corpus.** _Goal:_ run `draft-responses.bench` over person
  threads with `DEFAULT_DRAFT_INSTRUCTIONS`; score the 0–5 rubric across the model ladder. _Metric:_
  rubric scores; smallest model that clears the bar. _Deps:_ none.
- **C7. Automated research agent (CRM #5).** _Goal:_ prototype topic-scoped background research (web
  search/fetch) → cited findings note. _Metric:_ citation validity + relevance + cost. _Deps:_ web tools.
- **C8. Two-tier latency harness (CRM #9).** _Goal:_ model foreground (sync+classify+tag) vs background
  (enrich/summarize/facts/draft) and measure end-to-end "time to usable inbox" vs "time to full
  intelligence". _Metric:_ latency budget per tier. _Deps:_ none.

**How to parallelize:** C1, C4, C5, C6, C8 are fully independent and can run concurrently on separate
agents today. C2 depends on C4; C3 depends on the FactStore being populated (can start once C1 loads
facts). C7 is independent but needs web access.

## Part D — Near-term product follow-ups (from this session)

- Promote validated `ActiveTopic` fields (status/tasks-Outline/facts/drafts + confidence) into the
  product `Topic` + the suggestion flow.
- Wire the classify-sender class into `Mailbox.isReplyable({ senderClass })` at the draft call site.
- `AnchoredTo` cleanup when a Topic is deleted; live-feed thread resolution + deck-peer path for
  `TopicArticle`; fact extraction inside `CreateTopicFromMessage`.
