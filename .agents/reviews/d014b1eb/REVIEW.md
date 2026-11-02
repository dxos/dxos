---
branch: dm/practical-tesla-h7h9gt
commit: d014b1ebcf2f28f31168411221b53cfdab91ad70
base: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
mode: fast
createdAt: 2026-10-27T05:35:20.815Z
isFinalized: true
groups: 92
rules: [extract-non-rendering-logic-from-component, flat-layer-composition, mutate-echo-arrays-with-splice, namespace-brand-key-prefixing, toolbars-are-menu-actions]
reviewId: d014b1eb
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d014b1eb-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:59
- d014b1eb-2 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:107
- d014b1eb-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:143
- d014b1eb-4 - ignored - flat-layer-composition - packages/reflect/deus/src/cli/cli.test.ts:33
- d014b1eb-5 - ignored - namespace-brand-key-prefixing - packages/reflect/deus/src/cli/errors.ts:1

## Issues

# WARN d014b1eb-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:59`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 59-70 (`engine.fadeOut(action.seconds);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN d014b1eb-2 mutate-echo-arrays-with-splice `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:107`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.96. The likeliest place is lines 107-118 (`(id: string) => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN d014b1eb-3 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:143`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 143-154 (`);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN d014b1eb-4 flat-layer-composition `packages/reflect/deus/src/cli/cli.test.ts:33`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 33-49 (`const run = (args: string[], env: Record<string, string> = {}) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN d014b1eb-5 namespace-brand-key-prefixing `packages/reflect/deus/src/cli/errors.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.87. The likeliest place is lines 1-24 (`import { BaseError } from '@dxos/errors';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `04d5fb15a8b5e81ebbabcfc78abdadb969765750`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 187 uncertain, 319 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 258 (94 verdicts re-asked with context the model requested)
estimated input tokens: 1541414
billed input tokens: 1511633 (cost $0.0635)
measured chars per token: 3.06
```
