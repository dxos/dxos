---
'@dxos/react-ui-geo': patch
'@dxos/plugin-map': patch
---

Map and globe restyle: in light mode the globe uses a street-map palette (sky-blue water, mint land, borders a shade darker than the land) on a grey-blue background; globe markers are small solid dark-blue dots (amber when selected) and flat-map pins are 60% of Leaflet's default size; tour routes draw red; and the globe at rest leaves a margin rather than touching the edges. A map's `coordinates` are now its globe tour: the tour flies through them in order and loops, instead of visiting every marker.
