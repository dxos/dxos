---
order: 3
---

# Key Concepts

### Local first

All data is stored locally on-device, and is never stored on any servers. This means that the user's data is always available, even when offline, and is never at risk of being lost due to server outages or data breaches.

### Extensible

Every feature is implemented through the extensibility model, leaving nothing off-limits to malleability.

### Automatic replication

Data is continuously replicated across all the user's connected devices whenever online.

### Peer to peer

Data is always transmitted securely and **directly** between peers using WebRTC. No servers mediate the exchange of user data.

### Privacy-First

Ensures privacy, availability, and functionality while offline. No data silos or intermediaries.

### Multiplayer

When online, users can sense each other's presence and collaborate in real-time.

### Runs everywhere

Designed for mobile and desktop, works in modern browsers.

### Protocol based

The open source DXOS [SDK](../guide/) provides protocols for developing local-first applications. Composer is the flagship example of building on them, but they're available for any other project you can think of.



### Availability

Data is available on the peer network as long as peers are online. [Agents](../guide/tooling/cli/agent.md) are personal servers that can be used to boost data availability when the user's devices are offline. They are open source and can be run on any device, or hosted by a trusted third party.

### HALO decentralized identity

Composer uses the passwordless and decentralized identity management system [HALO](../guide/halo/) from DXOS. This means that users can access their data from any device without needing to remember a password. As long as some peers or agents are online, the user can restore their data to any new device.
