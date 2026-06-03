# @dxos/plugin-osrm

OSRM (OpenStreetMap) driving-route provider for Composer.

Implements the plugin-trip `RoutingService` capability by combining two free, no-key
OpenStreetMap services:

- **Nominatim** (`nominatim.openstreetmap.org`) — geocodes city names to coordinates.
- **OSRM** (`router.project-osrm.org`) — computes the `driving` route through an ordered list of
  coordinates, returning per-leg distance, duration, and polyline geometry.

plugin-trip's `PlanRoute` operation resolves this provider to turn an ordered list of cities into a
connected chain of road `Segment`s. The core plugin stays provider-agnostic; this provider is
swappable (e.g. for a keyed OpenRouteService implementation).

> Prototype: both upstream services are free public demo instances with usage policies (Nominatim
> ≤ 1 req/s; OSRM demo not for production traffic). Suitable for development and demos.

See `PLUGIN.mdl` for the full specification.
