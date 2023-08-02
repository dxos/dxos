# Progressive Multiplayer Store

This spec describes a new API for ECHO which does not require users to deal with identity choices before using ECHO locally. Until a new device or user needs to join the swarm, the API feels like using any regular ephemeral state container such as redux or signals, but supports persistence and credible exit out of box.

## Scenarios

1. Developers can use a reactive state container without requiring users to log in or create an identity.
2. Developers can upgrade the state container to a multi-device or multi-player state at any time by inviting a user or a device.
3. Users can close and open their application and see state persisted
4. Users can inspect and manipulate their data via HALO (when those features become available)



