---
order: 9
---

# Tunneling

Any application on the KUBE can be exposed to the internet through automatic tunneling.

Change property `module.tunnel` to `true` in `dx.yml` and redeploy your application.

```yml file=./snippets/app-tunneling.yml
```
Redeploy

```bash
dx app publish
```

The command will print the public URL of your application if tunneling is enabled. 🚀

::: info Tip
If using a DXOS [application template](../cli/app-templates) this is available as a script `pnpm run deploy`.
:::

To configure live tunnels on the KUBE directly, use the [`dx` CLI](../cli/tunneling).