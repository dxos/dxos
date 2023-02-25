---
order: 10
---

# Tunneling

The CLI can be used to configure live [tunnels](../kube/tunneling) on the [KUBE](../kube/).


Output of the command will contain public link of your application.

Alternatively, you could enable tunnel on already published app with the command:

```bash
dx tunnel set --app "name-of-your-app" --enabled
```

To disable the tunnel:

```bash
dx tunnel set --app "name-of-your-app" --disabled
```

To list active tunnels:

```bash
dx tunnel list
```

:::tip
Tunnel will be open while KUBE service is running. Tunnel URLs are persistent, so after KUBE restart or stop/start previously tunneled applications will be available on same public URLs.
:::

[Learn more about `dx.yml` in the KUBE section](../kube/dx-yml-file)
