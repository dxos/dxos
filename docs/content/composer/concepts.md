---
order: 2
---

# Key concepts

Below are some important things to know when using Composer.

### Local first

All data is stored locally on-device, and is never stored on any servers. This means that the user's data is always available, even when offline, and is never at risk of being lost due to server outages or data breaches.

### Automatic replication

Data is continuously replicated across all the user's connected devices whenever online.

### Peer to peer

Data is always transmitted securely and **directly** between peers using WebRTC. No servers mediate the exchange of user data.

### Multiplayer

When online, users can sense each other's presence and collaborate in real-time.

### Availability

Data is available on the peer network as long as peers are online. [Agents](https://docs.dxos.org/guide/platform/agents) are personal servers that can be used to boost data availability when the user's devices are offline. They are open source and can be run on any device, or hosted by a trusted third party.

### HALO decentralized identity

Composer uses the passwordless and decentralized identity management system [HALO](https://docs.dxos.org/guide/platform/halo) from DXOS. This means that users can access their data from any device without needing to remember a password. As long as some peers or agents are online, the user can restore their data to any new device.

### Extensibility

Every feature of Composer is implemented as a plugin. This means that developers can replace or extend any of Composer's functionality using the [plugin guide](plugins/). Community contributions are most welcome.
