---
'@dxos/protocols': patch
'@dxos/plugin-debug': minor
---

Add an in-app `@dxos/log` viewer (new `@dxos/react-ui-debug` `LogPanel`) so logs can be filtered, level-configured, and copied without opening DevTools; plugin-debug surfaces it as an R0 companion tab and a status-bar popover, and the devtools performance panel reuses the same component. Make the devtools `subscribeToFeeds`/`subscribeToSpaces` `feedKeys`/`spaceKeys` payload fields optional, fixing a Storage-panel schema decode error on empty subscriptions. Reimplement the devtools performance `Panel` and `PanelContainer` on the shared `@dxos/react-ui` `Panel` primitive.
