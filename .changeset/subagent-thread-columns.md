---
'@dxos/plugin-assistant': minor
---

`ChatPlane` is exported as `@dxos/plugin-assistant/ChatPlane`, and `ChatPlane.Cell` takes a `title`. While every column fits in the viewport, the plane centers them as a group rather than the selected column, so selecting one no longer pushes another off screen. A chat model given a subagent's thread shows that thread alone, so each subagent can be rendered in a column of its own. `Chat.Suggestions` offers premade prompts as chips above the composer. `AssistantCapabilities.ModelPreset` lets a plugin offer models beyond the built-in catalog in the chat's model picker.
