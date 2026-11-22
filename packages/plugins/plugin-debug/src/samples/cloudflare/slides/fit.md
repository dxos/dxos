---
title: 'What we add'
layout: 'default'
accent: 'rgb(246,130,31)'
---

# Opportunity: A new enterprise Stack

<Grid cols="3" align="center">

<Card icon="app-window" tone="neutral">

### Super app

</Card>
<Cell colSpan="2">

- One open application for a team's tools and its agents
- Cloudflare OS apps and Composer plugins, on one graph

</Cell>
<Card icon="puzzle-piece" tone="success">

### PLEX

</Card>
<Cell colSpan="2">

- The framework: apps built from plugins
- A new plugin works with the data an old one made

</Cell>
<Card icon="database" tone="info">

### ECHO

</Card>
<Cell colSpan="2">

- One typed graph shared by every app, not a database each
- A copy on every client, merged, with history per object

</Cell>
<Card icon="cloud">

### Cloudflare OS

</Card>
<Cell colSpan="2">

- The runtime: agents, compute and policy
- Where we overlap, we defer to it

</Cell>

</Grid>

<!--
Notes. 1:00
- Four layers, read from the bottom. Two are ours.
- Cloudflare OS is the runtime: agents, compute and policy. It replaces most of what we built for agents and compute, and there we defer to you.
- ECHO is the data. Cloudflare OS gives every app its own database. We give every app the same one. Every client holds a copy that merges, so a read never waits on the network, it works offline, and every object keeps its history.
- Agent Memory, which is yours, holds what was extracted from conversations. ECHO holds the records themselves. They go together.
- PLEX is the framework. Apps are built from plugins, and because plugins share one graph, a new one works with data an old one made.
- The top layer is the super app: one open application where Cloudflare OS apps and Composer plugins share the same graph.
- This is our reading of your posts. Correct it where we're wrong.
-->
