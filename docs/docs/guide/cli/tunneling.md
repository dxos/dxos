---
description: Tunneling apps
---

# Tunneling Apps

You can expose any application deployed to your local [KUBE](../kube) to the Internet through a tunnel.

To do this, change property `tunnel` to `true` inside `dx.yml`, and run publish command again:

```bash
dx publish
```

Output of the command will contain public link of your application.

Alternatively, you could enable tunnel on already published app with the command:

```bash
dx tunnel set --app "name-of-your-app" --enabled
```

To disable the tunnel:

```bash
dx tunnel set --app "name-of-your-app" --disabled
```

:::tip
Tunnel will be open while KUBE service is running. Tunnel URLs are persistent, so after KUBE restart or stop/start previously tunneled applications will be available on same public URLs.
:::

[Learn more about `dx.yml` in the KUBE section](../kube/dx-yml-file)
