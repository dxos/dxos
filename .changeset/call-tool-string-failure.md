---
'@dxos/ai': patch
---

`callTool` reports a tool that fails with a string as that string verbatim, rather than as `Error: <string>`, so a tool can choose exactly the text the model sees for its failure.
