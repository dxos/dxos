---
'@dxos/plugin-agent': minor
'@dxos/react-ui-assistant': patch
---

In `@dxos/plugin-agent`, agents have a built-in **Support** mode backed by a new community-support skill (`SupportSkill`, `org.dxos.skill.agentSupport`): it answers questions from what the agent knows, gathers bug reports and records them, and offers to ask the team member whose recalled expertise fits anything it cannot answer — relaying once the person agrees (at once for security, data-loss, billing or account issues) and reporting back in the thread, saying so plainly when no member fits or the message is not delivered — without ever asking for or repeating a secret.

In `@dxos/react-ui-assistant`, the Context panel above a prompt (synthetic context such as a document selection or a channel header) lays out its header like other disclosure panels: the caret and the icon each sit in a block either side of the title.
