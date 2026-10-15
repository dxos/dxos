---
branch: dm/shared-agents-a9thbd
commit: 767b4e4935f66d278ea9ea054036deccb6156395
base: f0fc12af989c688a046b73bfa345f5a971210fc7
mode: fast
createdAt: 2026-10-08T05:10:34.904Z
isFinalized: true
groups: 50
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, test-real-scenario-not-narrower-proxy]
reviewId: 767b4e49
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 767b4e49-1 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:142
- 767b4e49-2 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/triggers.test.ts:288
- 767b4e49-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:593

## Issues

# WARN 767b4e49-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:142`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.87. The likeliest place is lines 142-147 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 767b4e49-2 flat-layer-composition `packages/plugins/plugin-agent/src/operations/triggers.test.ts:288`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 288-311 (`const TestLayer = Layer.merge(brain.layer, testSpaceLayer).pipe(`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 767b4e49-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:593`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 593-616 (`const recordedQuotes = (chat: Chat.Chat) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f0fc12af989c688a046b73bfa345f5a971210fc7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 97 uncertain, 58 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 109 (73 verdicts re-asked with context the model requested)
estimated input tokens: 940091
billed input tokens: 916471 (cost $0.0385)
measured chars per token: 3.08
```

### Triage

All three `ignored`, no code change: the flagged lines (`brain.test.ts:142` scripted model, `triggers.test.ts:288` module-level `TestLayer`, `triggers.test.ts:593` `recordedQuotes`) predate this PR, which only swaps `CreateAgent` calls for `createLocalAgent`. The same findings were triaged on #13785 (`.agents/reviews/d29e09b8`).
