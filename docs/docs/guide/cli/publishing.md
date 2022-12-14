---
description: Publishing apps
---

# Publishing Apps

You can deploy your static (client-side) web applications to [KUBE](../kube) using the `dx` CLI.

To do this, drop a [`dx.yml`](../kube/dx-yml-file) file at the root of your project, and run:

```bash
dx publish
```

If you're using an [application template](./app-templates.md) or sample from DXOS, a `dx.yml` file is provided by default and the npm script `deploy` is available:

```bash
pnpm run deploy
```

:::tip
Take care not to omit the term `run` as `pnpm` will assume `deploy` means something else otherwise
:::

[Learn more about `dx.yml` in the KUBE section](../kube/dx-yml-file)
