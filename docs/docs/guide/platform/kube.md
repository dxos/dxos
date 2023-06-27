---
next: ../react
---

# KUBE Infrastructure

KUBE is a set of runtime services for static web apps and peer-to-peer applications. It can host applications on a local network and expose them to the outer internet via automatic tunneling. It also provides services for peer and network discovery.

*   Single, compact binary.
*   Runs as a service.
*   Exposes a command line interface and API.

KUBE instances form and propagate the peer-to-peer [MESH](../glossary#mesh) networks of DXOS.

Some of the services offered by KUBE:
| Service | Description |
| :-- | :-- |
| **Static App Service** | Static Applications are served as subdomains of the KUBE's hostname. KUBE-side code is coming soon. |
| **Publishing Service** | Accepts published bundles from [`dx app publish`](../cli/publishing) commands and deploys them to App Service |
| **IPFS** | KUBE runs an IPFS node and hosts application code in an IPFS instance |
| **Signaling Service** | Helps peers locate each other using [`libp2p`](https://libp2p.io/) |
| [STUN](https://en.wikipedia.org/wiki/STUN)<br>[TURN](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT)<br> [ICE](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment) | Network "hole punching", NAT traversal, and relay services for peer networking. |

### Next steps

*   KUBE [Installation](../kube)
*   [Build an application](../getting-started#project-templates) and [deploy to KUBE](../kube/deploying)
