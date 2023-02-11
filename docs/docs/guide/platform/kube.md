---
next: ../react
---

# KUBE Infrastructure

KUBE is a set of runtime services for static web apps and peer-to-peer applications. It can host applications on a local network and expose them to the outer internet via automatic tunneling. It also provides services for peer and network discovery.

*   Single, compact binary
*   Runs as a service
*   has a command line interface.

KUBE instances form and propagate the peer-to-peer [MESH](../glossary#mesh) networks of DXOS. Some of the services offered by KUBE:
| Service | Description |
| :-- | :-- |
| **Static App Service** | Static Applications are served as subdomains of the KUBE's hostname. KUBE-side code is coming soon. |
| **Publishing Service** | Accepts published bundles from [`dx app publish`](../cli/publishing) commands and deploys them to App Service |
| **IPFS** | KUBE runs an IPFS node and hosts application code in an IPFS instance |
| **Signaling Service** | helps peers locate the network and each other on top of `libp2p` |
| [STUN](https://en.wikipedia.org/wiki/STUN), [TURN](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT), [ICE](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment) | Network hole punching, traversal, and relay services |

### Next steps
- KUBE [Installation](../kube)
- [Build an application](../getting-started) and [deploy to KUBE](../getting-started#deploying-your-app-to-a-kube)