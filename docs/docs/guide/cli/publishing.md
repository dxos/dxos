---
description: Publishing apps
order: 5
---

# Publishing Apps

The `dx` CLI is used to deploy static apps to [KUBE](../kube).

Drop a [`dx.yml`](../kube/dx-yml-file) file at the root of the project, and run:

```bash
dx publish
```

If using an [application template](./app-templates) or [sample](../samples) from DXOS, a `dx.yml` file is provided by default and the npm script `deploy` is available:

```bash
pnpm run deploy
```

::: tip Tip
Take care not to omit the term `run` as `pnpm` will assume `deploy` means something else otherwise
:::

[Learn more about `dx.yml` in the KUBE section](../kube/dx-yml-file)
