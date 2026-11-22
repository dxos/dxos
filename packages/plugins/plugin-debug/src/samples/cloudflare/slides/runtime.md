---
title: 'How it runs on Cloudflare'
layout: 'default'
---

# How it runs on Cloudflare

<Surface ref="{{runtime}}" />

<!--
Notes. 1:00
- A SharedWorker in the browser holds the local copy in SQLite and serves every tab.
- One hibernatable WebSocket per identity, to a router Durable Object. Idle peers cost nothing.
- Per space: Replicator, Indexer, then triggers. An agent wakes when a query or a feed changes.
- About thirty Durable Object classes, about nine per space, all keyed by space ID. It scales by space.
- Local queries take 0.4 to 1.8 milliseconds at ten thousand objects.
- Identity is our own today. Mapping it onto Access is the first integration question.
-->
