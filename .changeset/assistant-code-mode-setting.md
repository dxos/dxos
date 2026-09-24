---
'@dxos/plugin-assistant': minor
'@dxos/react-ui-assistant': patch
---

Code mode for agent turns is now opt-in through the assistant's `codeMode` setting, off by default. The host supplies the engine through the new `codeModeTurnProducer` plugin option. A process picks its turn engine when it spawns, so toggling the setting affects agents started afterwards. A contributed `AgentTurnProducer` still takes precedence.

Tool calls whose input or result is a record of long or multi-line strings, such as a code-mode `eval`'s `code` and `output`, now render as text rather than truncated single-line JSON.
