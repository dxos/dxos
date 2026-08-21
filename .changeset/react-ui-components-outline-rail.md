---
'@dxos/react-ui-feed': minor
'@dxos/react-ui-components': minor
---

`@dxos/react-ui-feed` publishes: the feed engine (a model-driven, anchor-placed virtualized message
list), the standalone virtualizer (`@dxos/react-ui-feed/virtualizer`), the follow/navigation/
decoration/selection hooks, and the debug instrumentation (`@dxos/react-ui-feed/debug`). The
`Outline` rail (formerly `Minimap` in `@dxos/react-ui-components`) now lives there — import it from
`@dxos/react-ui-feed`. Along the way the rail gained even thinning to any height, a hover card that
tracks the tick's centre, and keyboard stepping through the host's `onNavigate`.
