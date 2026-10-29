---
'@dxos/plugin-agent': minor
'@dxos/edge-client': minor
---

An agent's admins keep their rights once EDGE checks them against the `IdentityAdmin` credentials the agent issues: an admin's Composer asks EDGE to make each member who can edit the agent's space one of its admins. Admins are only added; a member made a reader or removed stays an admin. `EdgeHttpClient` gains `getBrain` and `addBrainAdmin` for these calls.
