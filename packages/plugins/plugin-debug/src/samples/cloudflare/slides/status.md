---
title: 'Status'
layout: 'default'
---

# What's built, and what's next

<Grid cols="3" align="center">

<Card icon="check-circle" tone="success">

### Built

- Graph, queries, full-text search
- Sync, feeds and forks
- Triggers, MCP server
- Plugin registry

</Card>
<Card icon="arrow-circle-right" tone="info">

### Next

- Schema migration (partly built)
- Vector search
- Partial sync
- Access finer than a space

</Card>
<Card icon="wrench" tone="warning">

### In progress

- Large spaces: adaptive batching and a heads index
- Storage growth: compaction of live documents
- Moving onto Agents SDK, Workflows, Secrets Store

</Card>

</Grid>

<!--
Notes. 1:15
- Built: the graph, queries, full-text search, sync, feeds and forks, triggers, the MCP server, the plugin registry.
- Next: schema migration (partly built), vector search, partial sync, access finer than a space.
- Large spaces. The current ceiling is about 2,500 to 4,500 documents in one space. The fix is adaptive batching and a heads index, in progress. [Date.]
- Storage growth. Compaction of absorbed history ships. Compaction of live documents is next. [Date.]
- [Durable Object restarts on busy spaces: say only if the cause and the fix are known by Monday.]
- Where we overlap with you. Our agent runtime, scheduler and secrets were built before yours existed. We'd move onto the Agents SDK, Workflows and Secrets Store.
- One correction: the overview we sent on 4 Nov predates our reading of Agent Memory and Think. Its comparison table is out of date.
-->
