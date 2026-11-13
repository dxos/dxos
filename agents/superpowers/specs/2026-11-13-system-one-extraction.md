# System One models for RDF fact extraction

Date: 2026-11-13. Branch: `dm/discord-extraction`. Status: probe written, **not run live** (no credentials).

Probe: `packages/core/compute/pipeline-rdf/scripts/system-one-extract.ts`.

## Summary

- No key was available. `TYPESAFE_API_KEY` is not exported and `.secrets/typesafe.env` has an empty value. No
  Cloudflare Workers AI credential exists for Clairic. Only the dry run was executed; there are no measured
  latency or accuracy numbers.
- TypeSafe itself has no extraction model. Its API (`POST /v1/systemone`) answers `noul`, `choice`, `score` and
  `box` questions only. The span-returning model is **Cloudflare Clairic** (`@cf/cloudflare/clairic`, preview),
  already wired in `@dxos/ai` as `ExtractionModel` + `ClairicResolver` and reachable through EDGE
  (`workers-ai/clairic`).
- The proposed split fits the APIs. Clairic returns verbatim spans with character offsets, confidence and
  `p_null`. jev answers a `choice` over up to 255 criteria with a full probability distribution, so the 37-entry
  ontology (plus `other`) and the known-user list (plus `new`) each fit in one question.
- Projected cost is very low: about $0.0021 for the 5 sample messages (23 claims), about $0.0001 per claim. The
  predicate list dominates each jev request (about 2k tokens).
- The LLM output for the same messages shows where System One will fall short (see "Comparison"). The LLM
  invents predicates (`configures`, `rescheduled`, `called`), paraphrases objects into new nodes ("tools list
  optimization"), and resolves "you" from reply context that is not in the message.

## Models and APIs

| Model                             | Kind           | Endpoint                                                                                                                                      | Input                                                                                                  | Output                                                                                                | Price (input; output free)                                                                      |
| --------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| jev (`jev-latest`, `jev-preview`) | decision       | `https://api.typesafe.ai/v1/systemone`, bearer key; also Workers AI `typesafe/jev` via EDGE                                                   | `state` (string/object) + named `questions`                                                            | `noul` probability; `choice` + `confidence` + `probabilities`; `score` + distribution; `box` (images) | $0.042 / M (value in `agentic-review/lib/system-one/checker.ts`)                                |
| Clef, Clef Flash                  | decision       | Workers AI via EDGE only                                                                                                                      | same System One wire                                                                                   | same                                                                                                  | Workers AI pricing                                                                              |
| Clairic                           | **extraction** | Workers AI `@cf/cloudflare/clairic`: EDGE `workers-ai/clairic`, or `api.cloudflare.com/client/v4/accounts/<id>/ai/run/@cf/cloudflare/clairic` | `state` string + typed `fields` (`text`, `number`, `date`, `list`, `estimate`, ...) + `reference_date` | per field `value`, `guess`, `span` / `spans` (offsets into `state`), `confidence`, `p_null`           | $0.10 / M; each `text` field is one pass over `state`, other fields share one pass; 64k context |

Clairic has no `choice` / enum field type, so predicate choice and entity resolution must go to a decision model.

In repo:

- `packages/core/compute/ai/src/resolvers/typesafe/TypeSafeResolver.ts`: System One wire, `DecisionModel`.
- `packages/core/compute/ai/src/ExtractionModel.ts` + `resolvers/clairic/ClairicResolver.ts`: Clairic wire.
- `packages/core/compute/ai/src/Model.ts`: `typesafeJev`, `cloudflareJev`, `cloudflareClef`,
  `cloudflareClefFlash`, `cloudflareClairic`.
- `packages/plugins/plugin-typesafe/src/capabilities/edge-http-client.ts`: EDGE routing for all of them.
- `packages/plugins/plugin-inbox/src/operations/triage/extraction.ts`: an existing Clairic consumer.
- `.agents/skills/agentic-review/lib/system-one/client.ts`: dependency-free jev client (retry, concurrency cap).

## Probe design

One message goes through three stages.

1. **Claims** (Clairic): a `list` field `claims` over `"<author>: <text>"`. Each item is one proposition, returned
   as a span.
2. **Roles** (Clairic, per claim): `text` fields `subject` and `object` over `"<author>: <claim>"`. These are two
   passes over a short state.
3. **Decisions** (jev, per claim, one request). The state is `{author, message, claim, subject, object}` and the
   request asks four questions:
   - `is_fact` (`noul`): whether the claim is worth recording.
   - `predicate` (`choice`): the 37 `DEFAULT_ENTRIES` (label, description, synonyms) plus `other`.
   - `subject_entity` / `object_entity` (`choice`): the 8 known Discord users from `crawl.db` (key
     `user_<id>`, IRI `https://discord.com/users/<id>`) plus `new`.

A fact goes to the LLM fallback when `predicate` is `other` or its confidence is below `--min-confidence`
(default 0.6). Entity probabilities are printed as the top-2 distribution.

Without a jev key the run is a dry run. It prints the first request of each kind in full, the size of the rest,
and the projected cost; downstream stages use heuristic claims and roles. With a jev key but no Clairic route,
`--spans heuristic` exercises the decision stage alone. A `--max-cost` guard (default $0.50) stops sending
requests at the limit. The script also prints the LLM's facts for each message from `facts.db`, opened read-only.

Run: `bun packages/core/compute/pipeline-rdf/scripts/system-one-extract.ts --dry-run`

## Dry-run numbers (5 messages, 23 claims)

| Request                             | Size           | Est. tokens | Est. cost   |
| ----------------------------------- | -------------- | ----------- | ----------- |
| Clairic claims (per message)        | 400–800 chars  | 150–300     | $0.00003    |
| Clairic roles (per claim, 2 passes) | 370–620 chars  | 150–250     | $0.00002    |
| jev decision (per claim)            | 6.0–6.6k chars | about 2,100 | $0.00009    |
| Whole run                           |                |             | **$0.0021** |

These are estimates at 3 characters per token. The live path records `usage.input_tokens` and wall-clock
latency for each call (p50 and max) but was not run. For comparison, the LLM extractor's default model is
Claude Haiku 4.5 (`DEFAULT_MODEL` in `internal/stages/extract.ts`). It pays for a multi-KB rule prompt per chunk
plus generated JSON output, so it costs one to two orders of magnitude more per message (estimated, not measured).

## Comparison with the LLM extractor (from `facts.db`)

| Message                                                                 | LLM facts                                                                                                                                          | What System One can and cannot reproduce                                                                                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mykola: "...fixed a few of them, now I am optimizing our tools list..." | `Mykola worksOn discord-composer setup`, `completed unit tests...`, `worksOn tools list optimization`, `mentions PR that cuts tool tokens in half` | Predicates `works_on` / `completed` / `mentions` are all in the list and should be chosen. Objects would be spans ("our tools list"), not the LLM's paraphrased node labels.                                 |
| Mykola: limits per workspace (bullets)                                  | `Mykola configures global limit`, `CI workspace has 1000 dollar monthly limit`, ...                                                                | `configures` and `has` are LLM-minted predicates, so jev should answer `other`, and the fact goes to the LLM fallback. Bullets with no verb ("CI - 1000$/month") are hard to turn into subject/object spans. |
| dmaretskyi: four questions                                              | `dmaretskyi asked <question>` + `<question> text "<wording>"` ×4                                                                                   | A good fit: each claim span is the question wording, `asked` is in the list, and the subject is the author.                                                                                                  |
| kai: "I'm Kai — an agent working with the team..."                      | `kai jobTitle agent`, `worksFor team`, `helpsWith` ×4                                                                                              | A good fit: `has_role`, `works_for`, `helps_with`, and "I" resolves to the known user `kai`.                                                                                                                 |
| kai: summary addressed to "you"                                         | `Josiah worksOn onboarding with kai`, `Josiah rescheduled meeting...`                                                                              | "You" is Josiah only by reply context, so the state must carry the reply target / channel participants. `rescheduled` and `called` are not in the list and go to the fallback.                               |

## Findings

1. **Predicate normalization is the best fit.** It is a closed choice over ≤255 labelled options with
   calibrated probabilities. It replaces both the LLM's free-text predicate and much of
   `normalize-predicates.ts`. The `other` answer is the clean fallback signal.
2. **Entity linking against known entities is a natural `choice`.** Pass the participants (author, mentions,
   reply target) as criteria plus `new`; the distribution is the "entity guess with probability". It cannot
   resolve references that need context outside the state, so put that context in the state.
3. **Span extraction gives verbatim, attributable objects.** Clairic offsets map directly onto `semantic#quote`
   and `spanStart`/`spanEnd`, which the store already records. The cost is that objects are surface forms, not
   canonical names. "Tools list optimization" becomes "our tools list".
4. **Clause segmentation is the weakest link.** Pairing subject and object across a multi-proposition message
   needs a claims pass followed by a per-claim roles pass. Untested: whether Clairic's `list` returns clean
   clause boundaries on chatty Markdown (bullets, `@mentions`, code fences).
5. **System One cannot produce what the LLM produces beyond the closed vocabulary.** It cannot mint
   predicates, give definitions, set factuality/polarity nuance (partially: `noul`/`score` could rate
   factuality), set `validFrom`, or set illocution. Those stay with the LLM or are dropped for System One facts.

## Recommended pipeline

```
message ──► Clairic: claims (list, spans)
              └─► Clairic: subject / object per claim (text, spans)
                    └─► jev: is_fact, predicate (choice over ontology + other),
                             subject/object entity (choice over participants + new)
                          ├─ confident & listed predicate ──► Fact (extractor id 'system-one')
                          └─ other / low confidence / no spans ──► LLM extractChunk(claim) ──► Fact
```

- **System One owns:** claim segmentation, role spans, predicate choice, entity linking to known IRIs, and the
  noise filter (`is_fact`).
- **The LLM fallback runs per claim, not per message.** The fallback prompt is small and gets the claim plus
  System One's spans as hints. The fallback also takes messages where Clairic returns no claims, and any
  message that needs minted predicates (bulleted config dumps, narrative summaries).
- **Facts record `extractor.id` as `system-one`** (jev/Clairic models), with the choice probability as
  `factuality.confidence`. This lets the store compare and A/B the two paths.
- Integrate as a new `ExtractOptions.strategy` (or a stage before `extractChunk`) using `AiService.decisionModel`
  and `AiService.extractionModel`. Both resolve through EDGE in-app, so the app needs no vendor key.

## Next steps

1. Put a key in `.secrets/typesafe.env` (jev) and run
   `bun packages/core/compute/pipeline-rdf/scripts/system-one-extract.ts --spans heuristic` to measure predicate
   and entity accuracy alone (expected cost under $0.01).
2. Get Clairic access (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` with Workers AI, in
   `.secrets/cloudflare.env`, or `CLAIRIC_ENDPOINT` pointing at an EDGE dev proxy) and run the full path.
3. Score against `facts.db` over all 236 extracted messages: predicate agreement, entity agreement, and fallback
   rate.
