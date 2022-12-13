---
order: 0
dir:
  text: KUBE Infrastructure
  order: 18
---

# KUBE Overview

KUBE is a set of peer-to-peer services for applications
  - Single, compact binary
  - Runs as a service
  - has a command line interface.

KUBE instances form and propagate the MESH peer-to-peer networks of DXOS. Some of the services offered by KUBE:
| Service | Description |
| :-- | :-- |
| **Static App Service** | Static Applications are served as subdomains of the KUBE's hostname. KUBE-side code is coming soon. |
| **Publishing Service** | Accepts published bundles from [`dx app publish`](../cli/publishing) commands and deploys them to App Service |
| **IPFS** | KUBE runs an IPFS node and hosts application code in an IPFS instance |
| **Signaling Service** | helps peers locate the network and each other on top of `libp2p` |
| [STUN](https://en.wikipedia.org/wiki/STUN), [TURN](https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT), [ICE](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment) | Network hole punching, traversal, and relay services |

## Installation

To install KUBE:

```bash
sudo bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```

Alternatively, you might want to install latest `dev` version of the kube

```bash
sudo ch=dev bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```

After that, `kube` becomes available:

```bash
sudo kube start
```
