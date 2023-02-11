---
order: 0
dir:
  text: Hosting and Deployment
  order: 18
---

# KUBE Installation

KUBE is a set of runtime services for static web apps and peer-to-peer applications. It can host applications on a local network and expose them to the outer internet via automatic tunneling. It also provides services for peer and network discovery. Learn more about [KUBE](./platform/kube).

To install KUBE:

```bash file=../snippets/install-kube.sh
sudo bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

Alternatively, you might want to install latest `dev` version of the kube

```bash file=../snippets/install-kube-dev.sh
sudo ch=dev bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

After that, `kube` becomes available:

```bash
sudo kube start
```

Once it's running it will report status

```bash
kube status
```
