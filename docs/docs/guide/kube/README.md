---
position: 1
dir:
  text: KUBE Infrastructure
  order: 18
---

# KUBE Overview

KUBE is a set of peer-to-peer services, bundled into a single binary.

KUBE instances form and propagate the MESH peer-to-peer networks of DXOS. Some of the services offered by KUBE:

*   signaling: helping peers locate the network and each other
*   STUN, TURN, ICE: NAS hole punching and relay services
*   applications: applications are served as subdomains of the KUBE's hostname
*   IPFS: KUBE hosts all of it's content on an IPFS instance

## Installation

To install KUBE:

```bash
sudo bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```

Alternatively, you might want to install latest `dev` version of the kube

```bash
sudo ch=dev bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```
