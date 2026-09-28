---
'@dxos/react-ui-geo': minor
'@dxos/plugin-map': minor
---

`@dxos/react-ui-geo` adds a `WorldMap` component: markers with the selected one highlighted, and a toggle between the flat equirectangular map and a globe that turns about its axis to the selection. `flyTo` takes `path: 'axis'` and `msPerRadian`, point styles take a `selected` layer, and the `data` subpath exports `timezones`, the position of each IANA zone's principal city. plugin-map's `MapRole.World` role now takes `markers`, a `subject` and a `view`, and highlights the marker selected under the subject's URI. The Composer Plugin template's World Clock places each clock on the map and selects it on click.
