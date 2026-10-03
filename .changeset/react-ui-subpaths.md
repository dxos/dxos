---
'@dxos/react-ui': minor
---

Every `@dxos/react-ui` component family is now a namespace module with its own subpath. A compound family exports its parts: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`. A single component keeps its own names: `<Button.Button>`, `Button.ButtonProps`. General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The root exports namespaces only, so `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps` and `useTranslation` are gone, and so are the `@dxos/ui-types` re-exports (import those from `@dxos/ui-types`).
