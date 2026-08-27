---
'@dxos/ai': patch
---

Recover from tool calls with malformed JSON arguments: the provider stream no longer aborts the request (the parse failure is caught whether it arrives as an error or a raw `SyntaxError` defect), a tool call truncated mid-stream is finalized instead of staying pending forever, and unparseable arguments are reported back to the model as a tool error so it can retry.
