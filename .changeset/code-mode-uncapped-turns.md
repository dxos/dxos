---
'@dxos/agent-code-mode': patch
---

A code-mode turn is no longer stopped after 16 model/tool turns by default; `maxTurns` caps it only when a host passes one.
