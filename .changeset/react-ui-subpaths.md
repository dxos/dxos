---
'@dxos/react-ui': minor
'@dxos/react-ui-attention': minor
---

Every `@dxos/react-ui` component family is now a namespace module with its own subpath. A compound family exports its parts: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`. A single component keeps its own names: `<Icon.Icon>`, `Icon.IconProps`. Related components share a namespace: `Button` (`Button.Root`, `Button.Toggle`, `Button.Menu`, `Button.Group`), `Input` (`Input.Root`, `Input.Textarea`, `Input.Number`, `Input.Password`, `Input.Pin`, `Input.Date`, `Input.Slider`, `Input.Frame`, `Input.Checkbox`, `Input.Switch`), `Layout` (`Layout.Flex`, `Layout.Grid`, `Layout.Container`, `Layout.Block`, `Layout.Separator`), `Status` (`Status.Empty`, `Status.Skeleton`, `Status.Deferred`, `Status.Error`, `Status.Progress`, `Status.Steps`), `Typography` (`Typography.Text`, `Typography.Link`, `Typography.Timestamp`, `Typography.Crawl`) and `Media` (`Media.Image`, `Media.Player`). `ThemeProvider` is now `Theme.Provider`. General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The root exports namespaces only, so `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps` and `useTranslation` are gone, and so are the `@dxos/ui-types` re-exports (import those from `@dxos/ui-types`).

`AttentionGlyph` moves from `@dxos/react-ui` to `@dxos/react-ui-attention`.
