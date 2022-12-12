---
title: Overview
order: 0
dir:
  text: ECHO Database
  order: 10
---

# ECHO

ECHO (The **E**ventually **C**onsistent **H**ierrarhical **O**bject store) is a peer-to-peer graph database written in TypeScript.

- Secure, P2P data replication based on [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)
- No servers or central authority, all the data is with the clients
- Connectivity with peers via [WebRTC](https://en.wikipedia.org/wiki/WebRTC)
- Supports for multiple concurrent writers
- Collaboration on key-value objects, bodies of text, and other "custom data models".
- Supports offline writes and conflict resolution when peers rejoin the network