---
'@dxos/react-ui-assistant': patch
---

Tool rows in the assistant's run panel are titled by the backing operation's name and icon, the collapsed summary carries the same glyph as the rows it opens onto, and `status`/`reasoning` blocks fold into the run they narrate instead of splitting it into a panel per call. The summary reads `<last status> (ran X commands)` while the model is narrating, the command name for a lone call, and `Ran X commands` otherwise.
