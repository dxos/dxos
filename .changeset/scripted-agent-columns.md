---
'@dxos/ai': minor
'@dxos/plugin-assistant': minor
---

`ScriptedScene` (from `@dxos/ai/testing`) writes a scripted model as the conversations it plays: `user`, `system`, `tool` and `assistant` turns, plus a `generated` escape hatch for a hand-written turn generator. Patterns are strings, RegExps or template strings whose placeholders (`objectId`, `threadId`, `capture`) capture values from prompts and tool results and write them into later turns; a mismatch reports the conversation, the turn, the pattern as written and the full text it was tested against. `ScriptedLanguageModel.resolver` serves each script as a model of its own, `org.dxos.model.scripted.<name>`, beside the real models.

`ChatPlane` is exported as `@dxos/plugin-assistant/ChatPlane`, and `ChatPlane.Cell` takes a `title`. While every column fits in the viewport, the plane centers them as a group rather than the selected column, so selecting one no longer pushes another off screen. A chat model given a subagent's thread shows that thread alone, so each subagent can be rendered in a column of its own. `Chat.Suggestions` offers premade prompts as chips above the composer. `AssistantCapabilities.ModelPreset` lets a plugin offer models beyond the built-in catalog in the chat's model picker.
