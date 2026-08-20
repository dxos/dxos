---
'@dxos/echo': patch
---

Fix tabs reporting a healthy worker connection as failing: waiting for the worker leader lock is no longer bounded by a timeout, so a follower tab stays queued for takeover instead of backing off and escalating to a persistent-failure reload. A tab whose connect fails after the worker handed out its ports can also reconnect now, rather than having every retry discarded as a duplicate session.
