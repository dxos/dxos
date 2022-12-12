---
description: DXOS Application templates
label: Templates
---
# Application Templates
DXOS provides turnkey application templates complete with all the essentials for local application development.
## `hello` template
This is the default template when using `dx app create`. It inherits everything from the `bare` template and adds a single-page welcome guide which is easy to delete.

## `bare` template
This template provides some modern essentials for app development

| Feature | Description | 
| :-- | :-- |
| `vite` | A fast developer loop based on esbuild, great support for features like code-splitting. |
| `typescript` | Seriously, why wouldn't you? |
| `pwa` | Turnkey PWA configuration provided by `vite-plugin-pwa` |
| `@dxos/client` | ECHO, HALO, KUBE configuration support |
| `@dxos/react-uikit` | UI patterns for common DXOS scenarios |
| `tailwind` | A productive CSS framework |
| `sass` | A popular CSS preprocessor (on top of `postcss`) |
| `phosphor-icons` | A solid icons library |

## Source code
The templates can be found in the main [`dxos` repo](https://github.com/dxos/dxos) under [`packages/apps/templates`](https://github.com/dxos/dxos/tree/main/packages/apps/templates) with empty versions of them generated under [`packages/apps/samples`](https://github.com/dxos/dxos/tree/main/packages/apps/samples).