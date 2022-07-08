# MESH Spec

MESH is a set of protocols and technologies that enable resilient peer-to-peer networks.


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

<br/> 

![Signaling](./diagrams/mesh-signal.drawio.svg)


## Issues

- https://github.com/dxos/protocols/issues/1316 (Protobuf spec).




<br/><br/><br/><br/>

# Deprecated


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



Networking and replication mechanisms.

Peers can join swarms where WebRTC connections are esablished to other peers. 
This can allow for replication within a pary, invitations, and bot-factory communication.

Signal servers are hosted on KUBEs and are used to establish WebRTC connections.

Each connections has an associated `Protocol` object with it which defines the protocol capabilities in the form of extensions.
Extensions are generally created by plugins which implement the custom networking logic for different aspects of the stack: replication, authentication, invitaitons, presense, RPC and so on.
