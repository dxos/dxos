---
'@dxos/plugin-agent': minor
---

Agents can be set up on Discord and run community support there.

- `@dxos/plugin-agent`: a built-in **Support** mode backed by a community-support skill (`SupportSkill`) answers from what the agent knows, records bug reports, and offers to ask the team member whose expertise fits a question it cannot answer, never asking for or repeating a secret. The agent's Activity panel has a toolbar (refresh, connect or disconnect its channels), lists channels, skills and conversations alike, and deleting a thread conversation deletes the thread on its backend too. The Knowledge panel's Reset forgets the agent's memories and goals.
- `@dxos/plugin-thread`: a channel backend can delete a thread (`ChannelThreads.remove`, run by `ThreadOperation.DeleteThread`).
- `@dxos/react-ui-components`: a `Section` composite (`Section.Root`, `Section.Label`, `Section.Empty`) gives a panel's labelled lists one heading style, aligned with list rows.
- `@dxos/react-ui-debug`: `Logger.Root` takes a `buffer` prop, so a panel can show its own entries (`new LogBuffer()`, `append(entry)`) with the viewer's filtering, search and copy; rows centre their text, an open row keeps its header centred, and only one row is ringed at a time.
- `@dxos/react-ui-assistant`: the Context panel above a prompt lays out its header like other disclosure panels.
