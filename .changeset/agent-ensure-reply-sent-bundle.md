---
'@dxos/types': patch
---

Tool calls in an agent's history now record the annotations of the operation behind them, so plugin-agent's end-request reminder no longer asks an agent to resend a channel reply it already sent when the agent runs in its own EDGE bundle.
