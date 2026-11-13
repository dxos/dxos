---
'@dxos/ai': minor
---

`ScriptedScene` (from `@dxos/ai/testing`) writes a scripted model as the conversations it plays: `user`, `system`, `tool` and `assistant` turns, plus a `generated` escape hatch for a hand-written turn generator. Patterns are strings, RegExps or template strings whose placeholders (`objectId`, `threadId`, `capture`) capture values from prompts and tool results and write them into later turns; a mismatch reports the conversation, the turn, the pattern as written and the full text it was tested against. `ScriptedLanguageModel.resolver` serves each script as a model of its own, `org.dxos.model.scripted.<name>`, beside the real models.
