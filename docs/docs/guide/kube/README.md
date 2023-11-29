---
order: 0
dir:
  text: Hosting and Deployment
  order: 18
---

# KUBE Installation

KUBE is a set of runtime services for static web apps and peer-to-peer applications. It can host applications on a local network and expose them to the outer internet via automatic tunneling. It also provides services for peer and network discovery. Learn more about [KUBE](../platform/kube).

To install KUBE:

```bash file=../snippets/install-kube.sh
sudo bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

::: details Installing from the latest dev branch
The `dev` release of KUBE receives new features ahead of the production release. To install:

```bash file=../snippets/install-kube-dev.sh
sudo ch=dev bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

:::

After installation completes, the `kube` executable becomes available:

```bash
sudo kube start
```

Once running, KUBE reports status:

```bash
kube status
```

KUBE will [automatically stay up to date](./auto-update).
