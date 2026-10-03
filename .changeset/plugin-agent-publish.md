---
'@dxos/plugin-agent': minor
'@dxos/types': minor
---

`@dxos/plugin-agent` is published, so EDGE can host the agent's operations (fact reading, watches, relays) behind its Discord bot. The agent reads each conversation turn into RDF facts, recalls them across conversations, and keeps one-time and ongoing watches that notify people with updates written from the conversation's context. The `ProfileOf` relation (profile document → person or organization) moves from `@dxos/plugin-crm` to `@dxos/types`; its typename is unchanged, so existing profiles still resolve.
