---
'@dxos/echo': patch
---

Fix tabs reporting a healthy worker connection as failing: waiting for the worker leader lock is no longer bounded by a timeout, so a follower tab stays queued for takeover instead of backing off and escalating to a persistent-failure reload.
