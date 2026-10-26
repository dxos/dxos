---
branch: claude/hello-worker-diagram-demos
commit: 0e016829852ed40a4a534bbc205bd18187a44b59
base: 72d2f79b9d5b24db2712de32b01cac32e5c6db5d
mode: fast
createdAt: 2026-10-19T06:36:28.345Z
isFinalized: true
groups: 63
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 0e016829
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0e016829-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/project.ts:50
- 0e016829-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/tasks.ts:84

## Issues

# WARN 0e016829-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/project.ts:50`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 50-61 (`export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput>...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0e016829-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/tasks.ts:84`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 84-95 (`export const Tasks: SampleSpace.Partial<TasksResult> = SampleSpace.partial('t...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `72d2f79b9d5b24db2712de32b01cac32e5c6db5d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 100 uncertain, 153 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 163 (60 verdicts re-asked with context the model requested)
estimated input tokens: 968568
billed input tokens: 886185 (cost $0.0372)
measured chars per token: 3.28
```
