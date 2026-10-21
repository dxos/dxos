---
'@dxos/diagram': minor
---

A laid-out diagram opened in the Canvas editor ("Edit in Canvas") now draws with the same renderer as its SVG file: `SvgFile` builds a `Markup` tree (`sceneTree`, `elementMarkup`, `markerDefs`, `connectorElements`) that `@dxos/react-ui-canvas`'s new `diagram` node type and diagram connectors render, keeping the layout's bends, group tints, colors, fonts and markers; a connector whose box moves re-routes with the layout's own router (`UmlGrid.rerouteConnector`).
