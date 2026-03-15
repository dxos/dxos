# plugin-map

Interactive geographic mapping visualization for DXOS Composer.

## Status

Labs (experimental).

## Description

Renders spatial data from ECHO database records on an interactive map. Supports plotting table records with latitude/longitude coordinates, custom markers, and view-based data binding. Can also display a 3D globe view.

## Features

- **Map view**: Interactive 2D map powered by Leaflet/MapLibre with pan and zoom.
- **Globe view**: 3D globe rendering for geographic data exploration.
- **Data binding**: Links to a table/view via a pivot field containing GeoPoint coordinates.
- **Custom markers**: Plot arbitrary GeoPoint coordinates as pins on the map.
- **Create dialog**: Wizard to select a data type and location property when creating a new map object.
- **Persistent state**: Saves center position and zoom level per map object.
- **GeoPoint format**: Uses `Format.GeoPoint` from `@dxos/echo` for lat/lon values.
- **Operations**: Toggle map visibility via `MapOperation.Toggle`.
- **Translations**: Localizable UI strings.

## Schema

- `org.dxos.type.map` — Map object with optional view binding, center, zoom, and coordinates.
