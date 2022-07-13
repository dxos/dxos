# DXOS

## 1. Introduction

The Decentralized Operating System (DXOS) is a network OS that supports the development and operation of internet-scale decentralized applications.

DXOS is made up of multiple separable subsystems, many of which implement interoperable peer-to-peer networks.

DXOS consists primarily of the following core protocols.

| System                    | Description                                                 |
|---------------------------|-------------------------------------------------------------|
| [`ECHO`](./echo-spec.md)  | Data, synchronization and consistency.                      |
| [`HALO`](./halo-spec.md)  | Self-sovereign identity, credentials, and access control.   |
| [`MESH`](./mesh-spec.md)  | Resilient peer-to-peer networks.                            |
| [`DXNS`]()                | Federated graph database for system-wide metadata.          |

Additionally, the DXOS network incorporates other decentralized systems and technologies.

| System                    | Description                                                 |
|---------------------------|-------------------------------------------------------------|
| [`KUBE`]()                | Peer-to-peer networks of back-end servers.                  |
| [`IPFS`]()                | File replication.                                           |
| [`Avalanche`]()           | Scalable proof-of-stake blockchains.                        |
| [`DNS`]()                 | Network address discovery.                                  |

> - TODO(burdon): Diagram of KUBE services.


## Reference

See this [guide](https://github.com/dxos/eng/wiki/Guides-~-Writing-Documentation) to writing documentation.
