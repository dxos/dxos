---
branch: dm/determined-carson-93p088
commit: 020c7ab8637afae6416aef8a3e697a89d31b4061
base: 019891d36286a32a7060cdc0b9412ac52dcd6fe9
mode: fast
createdAt: 2026-10-14T09:34:56.170Z
isFinalized: true
groups: 203
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, log-fire-and-forget-rejections, no-casts, no-try-catch-in-effect-code, no-unused-new-api]
reviewId: 020c7ab8
---

_3 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 020c7ab8-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:202
- 020c7ab8-2 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/pipeline.test.ts:374
- 020c7ab8-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:96
- 020c7ab8-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:23
- 020c7ab8-5 - ignored - no-casts - packages/core/compute/pipeline-rdf/src/testing/index.ts:18
- 020c7ab8-6 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57
- 020c7ab8-7 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:54
- 020c7ab8-8 - ignored - no-unused-new-api - packages/stories/stories-brain/src/components/types.ts:48
- 020c7ab8-9 - ignored - log-fire-and-forget-rejections - packages/stories/stories-brain/src/stories/Pipeline.stories.tsx:286

## Issues

All nine are ignored: each points at code this PR did not introduce (the `as any` LanguageModel stubs in `testing/index.ts` and the plugin-brain tests, the `JSON.parse` salvage in `parseExtractPayload`, the existing `Effect.gen` stage bodies, `predicatesFromFacts`, `handleLoadDataset`, the pipeline test layer), so fixing them would widen the PR.

# WARN 020c7ab8-1 no-try-catch-in-effect-code `packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts:202`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 202-213 (`export const parseExtractPayload = (raw: string): ExtractPayload => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 020c7ab8-2 flat-layer-composition `packages/core/compute/pipeline-rdf/src/pipeline.test.ts:374`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 374-385 (`Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 020c7ab8-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/extract-facts.ts:96`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 96-107 (`export const extractDocFacts = (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 020c7ab8-4 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/stages/index-facts.ts:23`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 23-34 (`export const indexFactsStage = (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 020c7ab8-5 no-casts `packages/core/compute/pipeline-rdf/src/testing/index.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 18-31 (`export const mockAiService = (object: unknown): Layer.Layer<AiService.AiServi...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 020c7ab8-6 no-casts `packages/plugins/plugin-brain/src/operations/generate-reply.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-65 (`generateObject: () => Effect.succeed({ value: {}, content: [] }),`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 020c7ab8-7 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 54-67 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 020c7ab8-8 no-unused-new-api `packages/stories/stories-brain/src/components/types.ts:48`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.81. The likeliest place is lines 48-62 (`export const predicatesFromFacts = (facts: RDF.Fact[]): PredicateItem[] => {`, location confidence 0.88). Judged with added `diff, importers, public-api` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 020c7ab8-9 log-fire-and-forget-rejections `packages/stories/stories-brain/src/stories/Pipeline.stories.tsx:286`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.96. The likeliest place is lines 286-297 (`const handleLoadDataset = useCallback(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `019891d36286a32a7060cdc0b9412ac52dcd6fe9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 251 uncertain, 1545 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 732 (170 verdicts re-asked with context the model requested)
estimated input tokens: 5203782
billed input tokens: 4894642 (cost $0.2056)
measured chars per token: 3.19
```
