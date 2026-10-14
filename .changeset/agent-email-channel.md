---
'@dxos/plugin-agent': minor
---

Agents can have an email address: an Email channel (`AgentEmail` config: address, display name, allowed senders) claims `<handle>@dx.pub` on EDGE when connected, and EDGE's compute-service routes each email thread into its own chat of the agent and mails the agent's replies. The channel's properties panel edits the address and sender allowlist and shows the mailbox status.
