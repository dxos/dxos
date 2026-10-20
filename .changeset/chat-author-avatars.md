---
'@dxos/react-ui-assistant': patch
'@dxos/plugin-assistant': patch
---

An assistant chat that anyone besides the reader has written in shows an avatar beside every prompt, and names the prompts the reader did not write. `ChatThread.Root` takes `userDid` and `getAuthor` for this, and a prompt's row keeps its author's DID while it is on its way to the agent.
