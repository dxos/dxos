---
'@dxos/plugin-assistant': minor
---

Code mode for agent turns is now opt-in through the assistant's `codeMode` setting, off by default. The host supplies the engine through the new `codeModeTurnProducer` plugin option. A process picks its turn engine when it spawns, so toggling the setting affects agents started afterwards. A contributed `AgentTurnProducer` still takes precedence.
