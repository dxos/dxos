---
'@dxos/app-toolkit': minor
'@dxos/plugin-agent': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-mobile': patch
'@dxos/plugin-transcription': patch
'@dxos/plugin-theme': patch
---

The transcription microphone shows in every chat prompt again, just before Send: the Space Home prompt, the assistant companion before its first message, an agent's chat, and stored chats. Each prompt reads the buttons other plugins add to it from a hidden prompt node under the node that hosts it, which `AppNode.makePrompt`, `AppNode.getPromptId` and `AppNode.PROMPT_TYPE` describe; contributors file app-graph actions on it with the `prompt` disposition. Every surface that hosts a chat article now passes its graph node as `nodeId`, which is where the prompt finds its host. `ObjectAction` is deprecated in favour of app-graph actions on the subject's node.
