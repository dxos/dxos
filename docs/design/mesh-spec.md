# MESH Spec

MESH is a set of technologies that enable messaging across the DXOS network.


## Terminology

***Party*** -
Context for collaboration and data replication.

***Discovery Key*** - 
Hash of the party public key.

***Peer*** -
Participant in a swarm. Each peer has a long-lived public key.

***Swarm*** -
Peer-to-peer network of connected peers.

***Signaling*** -
Mechanism by which peers discovery each other and connect to a swarm.


## Signaling

Signaling enables two or more peers to discovery and conntect to each other forming a swarm.

<br/> ![Signaling](./diagrams/mesh-signal.drawio.svg)


### Notes/Issues

- Requirements (Browser, Server/bots, CLI, Mobile; data/video; transport agnostic: WebRTC/WSS, etc.)
- WSS between peer and signaling server (push messages)
  - gRPC protocol or custom?
- Direct messaging (e.g., for address book invitations)
  - General P2P messaging (gRPC?) Streams?
- Signaling message contains WebRTC protocol data (SIP, network interfacte, IP addr, STUN/TURN)
- DHT replication via Libp2p
- Guaranteed delivery
- Currently using discovery-swarm-webrtc
- Libp2p star repo is deprecated
- Security (e.g., hash party/device keys)
- Expiration of DHT
- General purpose p2p/broadcast messaging (out of swarm)
- Swarm MST
- Nat/ICE (STUN/TURN)
- Guaranteed delivery(likely just ACK)?
  - AXE for reliable streams? QUIC, SPDY
- Key exchange (in hypercore, @dxos/protocol?)
- Authentication (via HALO protocol)
- Encryption (WebRTC)
- Presence?

### Issues

- https://github.com/dxos/protocols/issues/1316
