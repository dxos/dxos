---
branch: claude/agent-turn-prompt-trims
commit: a9c3bb0d048f6aeabdb48ea114eb1e2e08d25608
base: 6cd526c4ebfb765f665818c2a5dd65121fb65bc7
mode: fast
createdAt: 2026-11-19T00:38:57.815Z
isFinalized: true
groups: 149
rules: [code-not-in-strings, declare-optional-services-with-noop-layers, error-messages-carry-context, errors-extend-base-error, flat-layer-composition, jsdoc-non-obvious-identifiers, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, operations-resolve-database-from-service, per-test-mutable-fixtures, test-real-scenario-not-narrower-proxy]
reviewId: a9c3bb0d04
---

_9 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a9c3bb0d04-1 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:29
- a9c3bb0d04-2 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:118
- a9c3bb0d04-3 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:72
- a9c3bb0d04-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:383
- a9c3bb0d04-5 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:122
- a9c3bb0d04-6 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:169
- a9c3bb0d04-7 - ignored - no-sleep-in-test - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:361
- a9c3bb0d04-8 - ignored - no-casts - packages/core/compute/ai/src/AiParser.test.ts:641
- a9c3bb0d04-9 - ignored - per-test-mutable-fixtures - packages/core/compute/ai/src/AiParser.test.ts:684
- a9c3bb0d04-10 - ignored - no-casts - packages/core/compute/ai/src/AiParser.ts:169
- a9c3bb0d04-11 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/AiParser.ts:677
- a9c3bb0d04-12 - ignored - error-messages-carry-context - packages/core/compute/ai/src/AiPreprocessor.ts:309
- a9c3bb0d04-13 - ignored - no-casts - packages/core/compute/ai/src/AiPreprocessor.ts:751
- a9c3bb0d04-14 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:419
- a9c3bb0d04-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/request/AiRequest.ts:491
- a9c3bb0d04-16 - ignored - error-messages-carry-context - packages/core/compute/assistant/src/request/AiRequest.ts:491
- a9c3bb0d04-17 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/request/AiRequest.ts:608
- a9c3bb0d04-18 - ignored - flat-layer-composition - packages/core/compute/assistant/src/request/format.test.ts:21
- a9c3bb0d04-19 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:168
- a9c3bb0d04-20 - ignored - errors-extend-base-error - packages/core/compute/assistant/src/session/AiSession.ts:50
- a9c3bb0d04-21 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:158
- a9c3bb0d04-22 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/AiSession.ts:446
- a9c3bb0d04-23 - ignored - no-casts - packages/plugins/plugin-space/src/operations/query-objects.test.ts:212
- a9c3bb0d04-24 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceOperation.ts:505
- a9c3bb0d04-25 - ignored - jsdoc-non-obvious-identifiers - packages/sdk/types/src/types/ContentBlock.ts:461

## Issues

# ERROR a9c3bb0d04-1 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:29`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 29-40 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-2 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 118-129 (`flush: () => run(Database.flush()),`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-3 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:72`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 72-83 (`AssistantTestLayer({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-4 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:383`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 383-392 (`const tryParseJson = (text: string): unknown => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-5 no-casts `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:122`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 122-133 (`const setup = () => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-6 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:169`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 169-180 (`const { rows, run } = setup();`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-7 no-sleep-in-test `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:361`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 361-372 (`);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-8 no-casts `packages/core/compute/ai/src/AiParser.test.ts:641`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 641-664 (`.pipe(Stream.runCollect);`, location confidence 0.24). Judged with added `test` context after a first pass of 0.60. This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-9 per-test-mutable-fixtures `packages/core/compute/ai/src/AiParser.test.ts:684`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.90. The likeliest place is lines 684-701 (`const text = (text: string[]): Iterable<Response.StreamPart<any>> => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-10 no-casts `packages/core/compute/ai/src/AiParser.ts:169`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 169-192 (`out.push(contentBlock as ContentBlock.Any);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-11 no-try-catch-in-effect-code `packages/core/compute/ai/src/AiParser.ts:677`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 677-694 (`let data: Record<string, unknown> | undefined;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-12 error-messages-carry-context `packages/core/compute/ai/src/AiPreprocessor.ts:309`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 309-325 (`const unwrapFileBase64Data = (url: string): Effect.Effect<string, PromptPrepr...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-13 no-casts `packages/core/compute/ai/src/AiPreprocessor.ts:751`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 751-774 (`const next = processUserOrAssistantPart(part);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-14 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:419`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 419-430 (`const messages = yield* stream.pipe(`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-15 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/request/AiRequest.ts:491`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 491-502 (`const toolCalls = this.getToolCalls();`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-16 error-messages-carry-context `packages/core/compute/assistant/src/request/AiRequest.ts:491`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 491-502 (`const toolCalls = this.getToolCalls();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-17 no-try-catch-in-effect-code `packages/core/compute/assistant/src/request/AiRequest.ts:608`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 608-619 (`let operationOpt: Option.Option<Operation.Definition.Any>;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-18 flat-layer-composition `packages/core/compute/assistant/src/request/format.test.ts:21`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 21-27 (`const testLayer = () =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-19 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:168`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 168-179 (`const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-20 errors-extend-base-error `packages/core/compute/assistant/src/session/AiSession.ts:50`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 50-54 (`export class McpServersUnavailable extends Schema.TaggedError<McpServersUnava...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-21 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:158`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 158-169 (`public async getHistory(): Promise<Message.Message[]> {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-22 flat-layer-composition `packages/core/compute/assistant/src/session/AiSession.ts:446`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 446-457 (`Layer.succeed(`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9c3bb0d04-23 no-casts `packages/plugins/plugin-space/src/operations/query-objects.test.ts:212`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 212-223 (`const outcome = yield* Effect.exit(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-24 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceOperation.ts:505`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 505-531 (`export const Migrate = Operation.make({`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9c3bb0d04-25 jsdoc-non-obvious-identifiers `packages/sdk/types/src/types/ContentBlock.ts:461`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 461-476 (`const Anchor = Schema.TaggedStruct('anchor', {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6cd526c4ebfb765f665818c2a5dd65121fb65bc7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 25 violations written to fragments, 245 uncertain, 798 clean, 0 unanswered
- left for an agentic reviewer: 79 batch(es)

```text
requests: 430 (140 verdicts re-asked with context the model requested)
estimated input tokens: 4966666
billed input tokens: 4663261 (cost $0.1959)
measured chars per token: 3.20
```
