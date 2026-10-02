---
'@dxos/ai': patch
---

`callTool` reports a tool that fails with a string as that string verbatim, rather than as `Error: <string>`, so a tool decides exactly the text the model sees for its failure. This includes an operation stopped mid-run, which now reaches the model as `Operation was terminated`. The assistant's tool widget renders a long or multiline string result or error as text rather than as a truncated JSON string.
