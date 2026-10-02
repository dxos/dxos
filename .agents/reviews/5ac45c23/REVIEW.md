---
branch: dm/dazzling-newton-pbjfi4
commit: 5ac45c2385018490e1f12e4badf8cbdc329a5dec
base: 57676339bdc204e94d85767a0c3632588d5a8d02
mode: fast
createdAt: 2026-10-02T10:00:38.212Z
isFinalized: true
groups: 97
rules: [event-handler-naming-convention, extract-non-rendering-logic-from-component, no-casts, story-for-new-ui-component, use-context-scoped-cancellation]
reviewId: 5ac45c23
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5ac45c23-1 - resolved - no-casts - packages/plugins/plugin-sandbox/src/containers/index.ts:1
- 5ac45c23-2 - ignored - story-for-new-ui-component - packages/plugins/plugin-sandbox/src/containers/SandboxArticle/SandboxArticle.tsx:30
- 5ac45c23-3 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:496
- 5ac45c23-4 - ignored - event-handler-naming-convention - packages/ui/react-ui-terminal/src/components/LineTerminal/LineTerminal.tsx:31
- 5ac45c23-5 - ignored - story-for-new-ui-component - packages/ui/react-ui-terminal/src/components/XtermView/XtermView.tsx:47
- 5ac45c23-6 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/XtermView/XtermView.tsx:107

## Issues

# ERROR 5ac45c23-1 no-casts `packages/plugins/plugin-sandbox/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 1-9 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `SandboxArticle` is typed `ComponentType<SandboxArticleProps>`. `RepositoryArticle`'s `any` predates this PR and is left as it is.

# WARN 5ac45c23-2 story-for-new-ui-component `packages/plugins/plugin-sandbox/src/containers/SandboxArticle/SandboxArticle.tsx:30`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 30-41 (`export const SandboxArticle = ({ role, subject: sandbox }: SandboxArticleProp...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the container only wires `Exec` to `LineTerminal`, which ships its own story; a story here would need the operation runtime and a live sandbox, which the QA-3 autocue flow covers instead.

# WARN 5ac45c23-3 use-context-scoped-cancellation `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:496`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 496-507 (`};`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code; this PR adds only a comment to `LocalSandboxBackend.exec`.

# WARN 5ac45c23-4 event-handler-naming-convention `packages/ui/react-ui-terminal/src/components/LineTerminal/LineTerminal.tsx:31`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.86. The likeliest place is lines 31-43 (`export const LineTerminal = ({ ref, classNames, evaluate, prompt = '$ ', bann...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `evaluate` is not an event notification but the work the terminal runs before showing the next prompt (it returns an Effect), so the on/handle naming does not fit.

# WARN 5ac45c23-5 story-for-new-ui-component `packages/ui/react-ui-terminal/src/components/XtermView/XtermView.tsx:47`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 47-58 (`export const XtermView = ({ ref, classNames, attach, fontSize = 13, dimension...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `XtermView` is the host primitive under `Terminal` and `LineTerminal`, whose stories exercise it.

# WARN 5ac45c23-6 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/XtermView/XtermView.tsx:107`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 107-118 (`const detach = attach(xterm);`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the effect body moved unchanged out of `Terminal`; extracting it is a refactor beyond this PR.

## Appendix

### System One pass

- model: jev-latest
- base for context: `57676339bdc204e94d85767a0c3632588d5a8d02`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 184 uncertain, 361 clean, 0 unanswered
- left for an agentic reviewer: 49 batch(es)

```text
requests: 322 (118 verdicts re-asked with context the model requested)
estimated input tokens: 1674739
billed input tokens: 1596499 (cost $0.0671)
measured chars per token: 3.15
```
