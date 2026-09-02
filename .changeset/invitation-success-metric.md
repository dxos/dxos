---
'@dxos/client-services': patch
---

Invitation guests now record `dxos.invitation.success`. Previously only the host recorded it, and only on the swarm path, so a space joined through a delegated (EDGE-admitted) invitation — the flow behind Composer share links — produced no success sample at all.

Every invitation counter (`host`, `success`, `timeout`, `failed`, `expired`) now carries `role` (`host` or `guest`) and `method` (`swarm` or `edge`) tags, so the two peers' samples can be counted separately instead of summing into a double count.
