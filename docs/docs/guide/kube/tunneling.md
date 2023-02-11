---
order: 9
---

# Tunneling

Any application on the KUBE can be exposed to the internet through automatic tunneling.

Change property `modules.tunnel` to `true` in `dx.yml` and redeploy your application.

```yml{16} file=./snippets/app-tunneling.yml
version: 1
modules:
  - type: dxos:type/app
    name: example-app
    display_name: Tasks List
    description: Mock application
    tags:
      - tasks
      - todo
      - productivity
    build:
      command: pnpm run build
      outdir: 'out'
      version: 1.2.3
      tag: latest
    tunnel: true
```

Redeploy

```bash
dx app publish
```

The command will print the public URL of your application if tunneling is enabled. 🚀

To configure live tunnels on the KUBE directly, use the [`dx` CLI](../cli/tunneling).

::: info Tip
If using a DXOS [application template](../cli/app-templates) this is available as a script `pnpm run deploy`.
:::

::: warning Caution
Tunnels will remain open while the KUBE service is running.
:::

::: note
Tunnel URLs are stable. When KUBE restarts, any tunneled applications will remain on the same public URLs.
:::
