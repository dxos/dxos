---
'@dxos/react-ui': minor
---

Adds `Drawer`, a panel that slides in from an edge of the viewport on Ark's drawer machine: swipe to dismiss, snap points for a bottom sheet, a grabber, modal and non-modal variants, a swipe area that opens it from the edge, and a `push` mode in which the panel is part of the page's layout and pushes its neighbours aside (`Drawer.Root transition` sets its open and close duration, `Drawer.Content size` its extent in rem, both matching `Splitter`'s so a drawer can sit in a split pane). `Panel.Root` takes the element to render as `as`. `Splitter.Panel` holds its anchored size as a fixed rem basis while split.
