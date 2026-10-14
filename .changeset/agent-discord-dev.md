---
'@dxos/compute-runtime': patch
'@dxos/plugin-discord': patch
---

A remote agent process that EDGE no longer hosts now fails in place instead of retrying its input forever, so the agent's next turn starts a new process; the agent Discord bot is now reached at EDGE's `/discord/bots` routes (served by discord-service), and the agent knowledge panel can show each fact as the RDF it is stored as.
