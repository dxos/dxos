---
description: DXOS Application templates
label: Templates
---

# Application Templates

DXOS provides turnkey application templates complete with all the essentials for local application development.

To create a new DXOS project:

```bash
npm init @dxos
# or
npm init @dxos/bare
```

These can also be used from the `dx` CLI:

```bash
dx app create --template <template-name> <project-name>
```

## `hello` template

This is the default template when using `npm init @dxos` or `dx app create`. It inherits everything from the `bare` template and adds a single-page welcome guide which is easy to delete.

## `bare` template

This template provides some opinions for app development:

| Feature | Description |
| :-- | :-- |
| `vite` | A fast developer loop based on esbuild. |
| `typescript` | Type safety |
| `vite-pwa` | Turnkey [PWA](../glossary#PWA) configuration provided by `vite-plugin-pwa` |
| `tailwind` | A productive CSS framework |
| `phosphor-icons` | A solid icons library |
| `@dxos/client` | ECHO, HALO, KUBE configuration support |
| `@dxos/react-components` | UI components for React |
| `@dxos/react-ui` | UI flows for managing HALO identity and ECHO spaces |

## Source code

The templates can be found in the main [`dxos` repo](https://github.com/dxos/dxos) under [`packages/apps/templates`](https://github.com/dxos/dxos/tree/main/packages/apps/templates).
