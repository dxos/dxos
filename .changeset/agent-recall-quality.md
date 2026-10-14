---
'@dxos/plugin-agent': patch
---

Agents recall what they were told more reliably: a nickname, handle or unique first name resolves to the person already known instead of creating a duplicate, a recall query matches by word and falls back to everything about the subject when it matches nothing, negated facts read back as "not:", and facts are no longer extracted from the agent's own replies or from a prompt the chat feed holds twice.
