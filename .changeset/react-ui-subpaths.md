---
'@dxos/react-ui': minor
'@dxos/plugin-client': minor
---

Every `@dxos/react-ui` component family is now a namespace module with its own subpath: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`, and a single component exports itself as `Root` (`<Icon.Root>`). General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The roots of `@dxos/react-ui`, `@dxos/effect` and `@dxos/async` export namespaces only: `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps`, `useTranslation` or the `@dxos/ui-types` re-exports are gone (import those types from `@dxos/ui-types`). `@dxos/effect` gains a subpath per namespace, including `KvsStore` (`KvsStore.make`, formerly `createKvsStore`) and `OtelTracer` (`OtelTracer.make`, `OtelTracer.layer`), and `@dxos/util/Position` is a subpath.
