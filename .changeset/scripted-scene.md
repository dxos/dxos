---
'@dxos/ai': minor
---

`ScriptedScene` (from `@dxos/ai/testing`) writes a scripted model as the conversations it plays: `user`, `tool` and `assistant` turns, with template-string placeholders (`objectId`, `threadId`, `capture`) that capture values from prompts and tool results and write them into later turns. `ScriptedLanguageModel.resolver` serves each script as a model of its own, `org.dxos.model.scripted.<name>`, beside the real models.
