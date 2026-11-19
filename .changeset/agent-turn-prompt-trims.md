---
'@dxos/ai': minor
'@dxos/types': minor
'@dxos/assistant': minor
'@dxos/agent-code-mode': minor
'@dxos/plugin-space': patch
'@dxos/plugin-agent': patch
---

Leaner agent turn prompts. A turn keeps the system prompt it started with: a skill, operation or object bound or unbound mid-turn is announced in a notice instead, in `AiSession` and in code mode, so the prompt cache holds across the turn. Skill definitions are named (`<skill name="…">`). Turns before the last five are compacted: their tool results, reasoning and stats are dropped, and each tool call is kept as a note of its input. The stats block records prompt-cache reads and writes (`cacheReadTokens`, `cacheWriteTokens`). `Dialect` gains `operations`. `queryObjects` names every result by `dxn`, `typename` and `label`, and `includeContent` adds the object's fields beside them.
