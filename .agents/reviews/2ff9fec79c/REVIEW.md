---
branch: dm/agent-13-oct-x8ehi8
commit: 2ff9fec79cea30da26f100705a829fbafbbbe784
base: 019891d36286a32a7060cdc0b9412ac52dcd6fe9
mode: fast
createdAt: 2026-10-14T09:23:15.013Z
isFinalized: true
groups: 82
rules: [extract-non-rendering-logic-from-component]
reviewId: 2ff9fec79c
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2ff9fec79c-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.tsx:470

## Issues

# WARN 2ff9fec79c-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.tsx:470`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 470-481 (`const AgentKnowledgeGraph = ({ nodes, edges }: AgentKnowledgeGraphProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `AgentKnowledgeGraph` predates this PR, which adds the Entities view beside it and leaves the graph untouched.

## Appendix

### System One pass

- model: jev-latest
- base for context: `019891d36286a32a7060cdc0b9412ac52dcd6fe9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 124 uncertain, 159 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 171 (78 verdicts re-asked with context the model requested)
estimated input tokens: 1143130
billed input tokens: 1126409 (cost $0.0473)
measured chars per token: 3.04
```
