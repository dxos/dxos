---
'@dxos/react-ui': minor
'@dxos/plugin-client': minor
---

Every `@dxos/react-ui` component family is now a namespace module with its own subpath: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`, and a single component exports itself as `Root` (`<Icon.Root>`). General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The root re-exports every namespace, so `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps` or `useTranslation` are gone. `@dxos/app-framework` adds `ProcessManagerPlugin.make()` and `Registry.EdgePluginProvider`, `@dxos/effect` namespaces and `@dxos/util/Position` get subpaths, and `@dxos/plugin-client/ClientOperation` is now the `ClientOperation` namespace module.
