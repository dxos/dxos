---
title: 'ECHO: the shared data'
layout: 'default'
---

# ECHO DB: The Enterprise Data Model

<Surface ref="{{spaces}}" />

<!--
Notes. 1:15
- like WSDL (overlay)
- A space is one team's or one project's graph. It is the unit of access and of replication.
- A space holds three kinds of data.
  - Graph: typed objects with first-class relations. One Automerge document each.
  - Feeds: append-only logs, ordered at the edge. Agent transcripts, chat, events.
  - Blobs: content-addressed files, in R2.
- People and agents are both members, each with its own identity and one of four roles: owner, admin, editor, reader. Every change carries who made it.
- On the left, apps are views onto the same objects. On the right, outside data syncs into the same model: [which of these ship].
- Objects can reference objects in other spaces. You can follow the link only if you are a member there.
-->
