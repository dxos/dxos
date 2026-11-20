---
branch: worktree-discord-backindex-pipeline
commit: 97a81679f69f809bee5124fb2276c5c29f1433f0
base: 7f9b8bc15fcdf75cc1c0a709ccedf2fe73578b7f
mode: fast
createdAt: 2026-11-20T13:35:59.697Z
isFinalized: true
groups: 104
rules: [empty-container-uses-empty, no-native-form-controls, no-styling-wrapper-divs, reactive-state-via-atom-bridge, ref-collections-via-query, toolbars-are-menu-actions]
reviewId: 97a81679f69
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 97a81679f69-1 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:56
- 97a81679f69-2 - ignored - no-native-form-controls - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:116
- 97a81679f69-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:140
- 97a81679f69-4 - ignored - empty-container-uses-empty - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:217
- 97a81679f69-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:250
- 97a81679f69-6 - ignored - ref-collections-via-query - packages/plugins/plugin-brain/src/templates/community-findings.test.ts:26

## Issues

# WARN 97a81679f69-1 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:56`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 56-67 (`const refresh = () => void statementCount(registry.forSpace(spaceId)).then(se...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97a81679f69-2 no-native-form-controls `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:116`

System One judges this a likely violation of `no-native-form-controls` (Edit objects with the schema-driven `Form`, never a native input), p=0.89. The likeliest place is lines 116-127 (`ref={fileInput}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97a81679f69-3 toolbars-are-menu-actions `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:140`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 140-151 (`data-testid='brain.memory.import'`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97a81679f69-4 empty-container-uses-empty `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:217`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.88. The likeliest place is lines 217-228 (`{entries.length === 0 ? (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97a81679f69-5 no-styling-wrapper-divs `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 250-261 (`<div className='flex items-center gap-2 text-sm text-description'>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97a81679f69-6 ref-collections-via-query `packages/plugins/plugin-brain/src/templates/community-findings.test.ts:26`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.86. The likeliest place is lines 26-38 (`expect(deck?.dependsOn?.map((ref) => ref.target?.id).sort()).toEqual(analyses...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7f9b8bc15fcdf75cc1c0a709ccedf2fe73578b7f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 119 uncertain, 156 clean, 0 unanswered
- left for an agentic reviewer: 76 batch(es)

```text
requests: 158 (72 verdicts re-asked with context the model requested)
estimated input tokens: 944510
billed input tokens: 870836 (cost $0.0366)
measured chars per token: 3.25
```
