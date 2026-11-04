---
'@dxos/plugin-agent': patch
---

Agent operations declare the types they write but plugin-agent does not register, so they run on EDGE, where a plugin bundle registers only its own types. `agent.create` and `agent.invite` declare the agent, chat, instructions, text and feed types; the chat operations declare chat and feed; and creating email channels, relays, people, organizations, profiles and skill copies declares those types. Before this, `agent.create` on EDGE failed with `Schema not registered Schema: org.dxos.type.instructions`.
