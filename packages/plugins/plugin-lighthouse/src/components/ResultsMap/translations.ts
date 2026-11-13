//
// Copyright 2026 DXOS.org
//

/** The results map's strings, under the plugin's namespace (copy from lighthouse's web UI, WEB QA-8). */
export const mapTranslations: Record<string, string> = {
  'mode-map.label': 'Map',
  'map.label': 'Results map',
  'map-count.label': '{{rated}} of {{total}} on the map',
  'map-landmarks.label': ' (+{{count}} unrated places)',
  'map-inside.label_one': ' · {{inside}} inside{{near}} your area',
  'map-inside.label_other': ' · {{inside}} inside{{near}} your areas',
  'map-near.label': ', {{count}} near',
  'map-unlocated.label': ' · {{count}} with no location',
  'map-lasso.label': 'Draw an area',
  'map-lasso.title': 'Drag around the part of town you want; it closes itself',
  'map-circle.label': 'Near a point',
  'map-circle.title': 'Press on a point (a metro station, work) and drag out the distance',
  'map-lasso.hint': 'Drag around the area — it closes when you let go · Esc cancels',
  'map-circle.hint': 'Press on a point and drag out the distance (a click is 600 m) · Esc cancels',
  'map-cancel.label': 'Cancel',
  'map-areas.label': 'Your areas',
  'map-area-zoom.label': 'Show {{area}} on the map',
  'map-area-name.label': 'Area name',
  'map-area-inside.label': '{{count}} inside',
  'map-area-mode.label': 'How it counts',
  'map-area-prefer.label': 'Prefer',
  'map-area-prefer.title': 'A term: inside scores 1, fading over the soft edge',
  'map-area-require.label': 'Require',
  'map-area-require.title': 'A requirement: beyond the soft edge, the score is multiplied by the penalty',
  'map-area-soft.label': 'soft edge',
  'map-area-soft-of.label': 'Soft edge of {{area}}, metres',
  'map-area-soft-none.label': 'none',
  'map-area-delete.label': 'Delete {{area}}',
  'map-empty.message': 'No result has a location yet.',
};
