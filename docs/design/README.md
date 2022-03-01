# DXOS Design Documents

## The stack

<img src="./diagrams/stack.drawio.svg">

### Client

Hosts top-level DXOS APIs. Bootstraps the entire stack.

Can work in local or remote mode where it connects to a DXOS node through a socket.
This is usefull for browser apps connecting to DXOS stack running in the wallet.

### HALO

Credentials and access control mechanisms.

Each identitiy is created from a set of DIDs and keys stored in the keyring.

### ECHO

[Main page](./echo.md)

Eventually-Consistent Hierrarhical Object-store.

Processes mutations and snapshots to maintain a set of items and links with models.
ECHO is a hierrahical graph database where items a stored in a tree structure, connected by links.
Each item or link has state-machine and a model.

[Architecture](./diagrams/echo-architecture.drawio.png)

#### Models and state machines

Represent the data types in the ECHO database.

Model provides the public API for the data type, while state-machiene manages the state.

The most common is the `ObjectModel` which is a key-value store.

Other examples include `TextModel`, `ChessModel`, `MessengerModel`. Users can register their own custom models and state machines.

[Architecture](./diagrams/state-machine.drawio.svg)

### MESH

Networking and replication mechanisms.

Peers can join swarms where WebRTC connections are esablished to other peers. 
This can allow for replication within a pary, invitations, and bot-factory communication.

Signal servers are hosted on KUBEs and are used to establish WebRTC connections.

Each connections has an associated `Protocol` object with it which defines the protocol capabilities in the form of extensions.
Extensions are generally created by plugins which implement the custom networking logic for different aspects of the stack: replication, authentication, invitaitons, presense, RPC and so on.

[Architecture](./diagrams/mesh.drawio.svg)

## Infrastucture and tools

### Bot factory

A runtime to run long running processes: bots.

Bots are packaged and published on DXNS blockchain.
Bot factory downloads them and runs them.

Communication with a bot factory is done via an RPC port shared via MESH.
Clients can send commands to spawn new bots or to control the existing ones.

Bot factory is designed to allow for many bot runtimes: NodeJS, Deno, Docker, browser (playwright), etc.

[Architecture](./diagrams/bot.drawio.svg)

### Protobuf compiler

Compiles protobuf schema declaration files into typescript type definitions.

Supports pluggable codecs for specific protobuf types via substitution files.
For example `dxos.halo.keys.PubKey` message would be replaced with `PublicKey` class during serialization and in the type definitions.
