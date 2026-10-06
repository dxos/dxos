---
branch: claude/resume-plugin-projects-7558db
commit: 8582f95ce0f51b0e939eecbe77c61f8338d917b3
base: 52e05e33cd108e1efee8ab59eb5e6224082d65b8
mode: fast
createdAt: 2026-10-06T13:34:17.282Z
isFinalized: true
groups: 163
rules: [effect-fn-not-hand-wrapped-gen, namespace-export-with-internal-hiding, no-casts, test-asserts-real-behavior]
reviewId: 8582f95ce0f
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8582f95ce0f-1 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:102 (outside this PR: already on main via #13590; this PR changes only .agents/projects/agent-brain/DESIGN.md)
- 8582f95ce0f-2 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:294 (outside this PR: already on main via #13590; this PR changes only .agents/projects/agent-brain/DESIGN.md)
- 8582f95ce0f-3 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:344 (outside this PR: already on main via #13590; this PR changes only .agents/projects/agent-brain/DESIGN.md)
- 8582f95ce0f-4 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-agent/src/index.ts:1 (outside this PR: already on main via #13590; this PR changes only .agents/projects/agent-brain/DESIGN.md)
- 8582f95ce0f-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/relay.test.ts:82 (outside this PR: already on main via #13590; this PR changes only .agents/projects/agent-brain/DESIGN.md)
- 8582f95ce0f-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:538 (outside this PR: already on main via #13590; this PR changes only .agents/projects/agent-brain/DESIGN.md)

## Issues

# WARN 8582f95ce0f-1 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:102`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 102-125 (`const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8582f95ce0f-2 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:294`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 294-317 (`getSchemaReference(getSchemaProperty(jsonSchema, 'organization' as SchemaEx.J...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8582f95ce0f-3 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:344`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 344-355 (`const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8582f95ce0f-4 namespace-export-with-internal-hiding `packages/plugins/plugin-agent/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as AgentKnowledge from './AgentKnowledge.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8582f95ce0f-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/relay.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 82-88 (`const chatMessages = (chat: Chat.Chat) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8582f95ce0f-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:538`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 538-549 (`const recordedQuotes = (chat: Chat.Chat) =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `52e05e33cd108e1efee8ab59eb5e6224082d65b8`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 208 uncertain, 1406 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 656 (157 verdicts re-asked with context the model requested)
estimated input tokens: 3968537
billed input tokens: 3675663 (cost $0.1544)
measured chars per token: 3.24
```
