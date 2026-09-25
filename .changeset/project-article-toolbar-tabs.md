---
'@dxos/react-ui': patch
'@dxos/plugin-projects': patch
---

`Tabs.Tablist` sizes itself as a toolbar item when rendered inside a `Toolbar.Root` (content width, unpadded, never squeezed by a full-width sibling), so containers no longer pass `w-auto`/`p-0` to embed tabs in a toolbar. The Project article's Overview/Tasks tabs, which had collapsed to zero width beside the action toolbar, are visible again and are now part of the article's single action toolbar. The Projects plugin declares the Assistant plugin as a dependency, so hosts that run Projects (including the CLI) register Assistant beside it.
