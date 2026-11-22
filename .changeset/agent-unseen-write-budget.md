---
'@dxos/agent-runtime': patch
---

A resident agent process gives each new prompt the full retry budget for reading its own write back. Before this change, once one prompt used up the budget while the feed read lagged, every later prompt in that process got a single read, and then the agent gave up on it without a reply.
