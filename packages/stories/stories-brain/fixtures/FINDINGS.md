# Brain-skill applied research — findings

Corpus: a mailbox/email feed fixture (~100 messages; eval over the first ~40 by date). Fixture content
is local-only; this write-up is generic (no names, senders, or message content).

## Setup

Reusable harness in `src/testing/harness/`. Phase-2/3 test `brain-skill-eval.test.ts` runs one prompt
across the matrix **{6 models} × {4 skill modes}**:

- **database** — baseline: Database skill only (queries the ECHO space + feed, incl. queues).
- **brain** — Database + stock Brain skill (fact-store `QueryFacts` / `SummarizeSubject`).
- **brain-v2** — Database + a more directive Brain skill (same tools, prompt forces `SummarizeSubject`
  first and forbids giving up before both tools return empty).
- **rag** — Database + a RAG skill: USearch cosine index over ollama `nomic-embed-text` embeddings of
  sender+subject+body, retrieved by semantic similarity.

## Result matrix

| model         | database          | brain             | brain-v2 | rag                  |
| ------------- | ----------------- | ----------------- | -------- | -------------------- |
| llama-3.2-3b  | ✗                 | ✗                 | ✗        | ✗                    |
| qwen-2.5-7b   | ✗                 | ✗                 | ✗        | ✗                    |
| gemma-4-12b   | ✗                 | ✗                 | ✗        | ✗                    |
| claude-haiku  | **found nothing** | ✓ facts           | ✓ facts  | ✓ messages           |
| claude-sonnet | ✓ richest         | ✓ facts (thinner) | ✓ facts  | ✓ messages (partial) |
| claude-opus   | ✓ rich            | ✓ rich            | ✓ rich   | ✓ messages (partial) |

(✗ = run errored. ok runs: response chars 780–2340; rag was consistently the fastest ok mode,
~4.8–11s vs database 8.7–18.4s.)

## Findings

1. **Local models can't drive the agentic tool loop.** All three (llama-3.2-3b, qwen-2.5-7b,
   gemma-4-12b) failed _every_ mode with `ChatCompletionsClient.streamText: Value looks like object,
but can't find closing '}'` — they emit malformed tool-call JSON. Agentic skill use here needs a
   tool-calling-capable model; the local tier is unusable for this task as-is.

2. **The brain skill's value is inversely proportional to model capability — for THIS prompt.**
   - claude-haiku's **baseline failed** (couldn't find any messages from the target sender): the
     Database Query tool doesn't retrieve well by _sender_ (sender is a structured field, not body
     text). Here **brain and rag both rescue the answer** — clear, large value.
   - claude-sonnet / claude-opus **baselines already succeed** — capable models issue several
     creative feed queries and reconstruct the full thread. For them the brain skill did **not** beat
     the baseline on this prompt; its fact abstraction was sometimes _thinner_ than reading the raw
     messages (sonnet: database found the full thread with dates; brain returned 3 abstracted facts).

3. **Facts vs. messages are different currencies.** The fact store returns _abstracted, cross-message
   claims_ (commitments, action items, availability) with factuality/confidence — great for "what do
   we know about X" analytical questions, but it drops verbatim detail. RAG returns _concrete message
   snippets_ — better for "summarize messages from X", but bounded by top-k (missed messages that
   sonnet's baseline found by exhaustive querying). They are complementary, not competing.

4. **The prompt is a retrieval task, which flatters RAG and the baseline over facts.** "Summarize
   messages from X" is fundamentally "retrieve X's messages, then summarize" — RAG and direct feed
   reading serve it directly; the fact store is a lossy intermediary for it. The brain skill would
   likely win on prompts it's designed for (e.g. "what has person X committed to?", "what's the status
   of a given payment thread?").

5. **brain-v2 (directive prompt) helped marginally.** It produced slightly more complete/structured
   summaries (opus brain-v2 surfaced more threads than opus brain) and reliably called the fact tools
   first, but did not change the headline conclusion. Prompt directives help weaker-but-capable
   models commit to the tools; they can't fix a model that can't tool-call at all (local tier).

6. **The eval metric is too weak.** `subjectMentions` saturated at 2 for every ok run (the prompt
   echoes the name). Real evaluation needs an LLM judge scoring grounding/faithfulness/completeness
   against the actual messages.

## Techniques likely to yield better results

- **Hybrid retrieval (highest expected value):** give the agent BOTH skills, or a fact→source
  bridge — `SummarizeSubject` should return the _source message DXNs_ and the agent (or the op) should
  fetch those messages so answers combine fact-level structure with verbatim grounding.
- **Fix sender-scoped retrieval in the Database skill** — a "messages by sender" query path (or index
  sender name/email for full-text). This is the specific gap that sank haiku's baseline.
- **Improve RAG:** larger/adaptive top-k, per-chunk (not per-message) embeddings, and return full
  message on hit rather than a 600-char snippet; add a re-rank pass.
- **Enrich the fact store** so it isn't lossy for retrieval prompts: store a short source excerpt with
  each fact.
- **Local models:** use a tool-calling-tuned local model and/or constrained decoding (JSON grammar /
  `tool_choice`) so they can participate; otherwise scope local models to non-agentic pipeline stages
  (Phase 1), where they worked fine.
- **LLM-judge evaluation** with a rubric (did it find the right messages? faithful? complete? concise?)
  to replace `subjectMentions` and make the comparison quantitative.

## Next steps

1. Add an LLM-judge scorer to the eval harness and re-run (turns this into a real benchmark).
2. Implement the fact→source bridge in `SummarizeSubject` and re-test brain vs rag.
3. Add prompts that play to the fact store's strengths (analytical/entity questions), not just
   "summarize messages from X", and compare per prompt-type.
4. Add a `hybrid` mode (Database + Brain + RAG) and measure whether it dominates.
5. Add a sender-scoped retrieval tool to the Database skill and re-measure the baseline.
