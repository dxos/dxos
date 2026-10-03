---
'@dxos/react-ui': minor
'@dxos/plugin-client': minor
---

Every `@dxos/react-ui` component family is now a namespace module with its own subpath: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`, and a single component exports itself as `Root` (`<Icon.Root>`). General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The `@dxos/react-ui` root exports namespaces only: `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps`, `useTranslation` or the `@dxos/ui-types` re-exports are gone (import those types from `@dxos/ui-types`). `@dxos/util/Position` is a subpath.
