---
'@dxos/react-ui': minor
'@dxos/react-ui-attention': minor
---

Every `@dxos/react-ui` component family is now a namespace module with its own subpath. A compound family exports its parts: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`. A single component keeps its own names: `<Button.Button>`, `Button.ButtonProps`. Related components share a namespace: `Typography` (`Typography.Text`, `Typography.Link`, `Typography.Timestamp`, `Typography.Crawl`), `Media` (`Media.Image`, `Media.Player`) and `Progress` (`Progress.Progress`, `Progress.Steps`). `ThemeProvider` is now `Theme.Provider`, `DateInput` is `DatePicker.Input`, and `Slider` is `Slider.Input`. General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The root exports namespaces only, so `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps` and `useTranslation` are gone, and so are the `@dxos/ui-types` re-exports (import those from `@dxos/ui-types`).

`AttentionGlyph` moves from `@dxos/react-ui` to `@dxos/react-ui-attention`.
