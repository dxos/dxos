---
order: 10
---

# Tunneling

The CLI can be used to configure live [tunnels](../kube/tunneling) on the [KUBE](../kube/).

To enable tunneling for an existing app:

```bash
dx tunnel set --app "name-of-your-app" --enabled
```

To disable a tunnel:

```bash
dx tunnel set --app "name-of-your-app" --disabled
```

To list active tunnels:

```bash
dx tunnel list
```

Learn more about how to configure [tunneling in `dx.yml`](../kube/tunneling).
