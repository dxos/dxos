---
branch: dm/zealous-bohr-833aun
commit: 119067016bdaacdf803924f4ee9df532c35171e6
base: 11efa0079a28071146f23ac827865c9e94fb73d1
mode: fast
createdAt: 2026-10-27T16:01:37.941Z
isFinalized: true
groups: 69
rules: [comment-hygiene]
reviewId: 11906701
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 11906701-1 - ignored - comment-hygiene - packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43

## Issues

# WARN 11906701-1 comment-hygiene `packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.88. The likeliest place is lines 43-54 (`applyActive: true,`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the flagged comment is the pre-existing `TODO(wittjosiah)` on `value`; this PR adds only the `placement` line above it.

## Appendix

### System One pass

- model: jev-latest
- base for context: `11efa0079a28071146f23ac827865c9e94fb73d1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 107 uncertain, 116 clean, 0 unanswered
- left for an agentic reviewer: 50 batch(es)

```text
requests: 140 (47 verdicts re-asked with context the model requested)
estimated input tokens: 868803
billed input tokens: 841930 (cost $0.0354)
measured chars per token: 3.10
```
