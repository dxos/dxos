---
branch: claude/composer-plugin-deepseek-demo-v0t1io
commit: 9bb2dadc85d164d1c0849bb9245ead5f34c4ef59
base: dce0aace2347cf2b662e9457275833adf5bfb411
mode: fast
createdAt: 2026-09-27T14:08:58.745Z
isFinalized: true
groups: 56
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: 9bb2dadc
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9bb2dadc-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/plugin/project.ts:44

## Issues

# WARN 9bb2dadc-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/plugin/project.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 44-55 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `dce0aace2347cf2b662e9457275833adf5bfb411`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 100 uncertain, 190 clean, 0 unanswered

```text
requests: 173 (68 verdicts re-asked with context the model requested)
estimated input tokens: 1044177
billed input tokens: 984847 (cost $0.0414)
measured chars per token: 3.18
```
