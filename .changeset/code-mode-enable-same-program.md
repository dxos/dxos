---
'@dxos/agent-code-mode': patch
'@dxos/assistant-toolkit': patch
---

In code mode's Effect dialect, a program that enables a skill can resolve and call that skill's operations right away, in the same `eval`, instead of on the next model call. The Skill Manager's code-mode instructions say so for a dialect that supports it, and `makeForCodeMode` takes a `sameProgram` option for it.
