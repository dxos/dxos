//
// Copyright 2026 DXOS.org
//

import { type ThemeMode } from '@dxos/ui-types';

import { type StyleSet } from './render.ts';

/**
 * Default style set for the Globe, theme-aware. Originated in plugin-map's
 * GlobeControl; lifted here so other plugins (plugin-trip, etc.) get the same
 * baseline without copying the palette.
 */
// Point colour; lines pick up the same colour at reduced alpha so the route
// reads as belonging to the same node set without competing with the nodes.
const POINT_COLOR = 'rgb(30, 58, 138)';
const LINE_COLOR = 'rgba(30, 58, 138, 0.5)';

// The selected point is larger, ringed and amber, so it reads at a glance among the blue others.
const SELECTED_COLOR = 'rgb(245, 158, 11)';
const SELECTED_RING = 'rgba(255, 255, 255, 0.9)';

export const globeStyles = (themeMode: ThemeMode): StyleSet =>
  themeMode === 'dark'
    ? {
        water: {
          fillStyle: '#191919',
        },
        land: {
          fillStyle: '#444',
          strokeStyle: '#222',
        },
        border: {
          strokeStyle: '#111',
        },
        graticule: {
          strokeStyle: '#111',
        },
        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: LINE_COLOR,
        },
        // Small so dense clusters (a city's data centres) stay separate dots rather than merging into a blob.
        point: {
          pointRadius: 1.5,
          fillStyle: POINT_COLOR,
        },
        selected: {
          pointRadius: 4,
          fillStyle: SELECTED_COLOR,
          strokeStyle: SELECTED_RING,
          lineWidth: 2,
        },
      }
    : {
        // Outside the globe: the r0 surface's lightness with a grey-blue hue, so the sphere sits on the app's own tone.
        background: {
          fillStyle: 'oklch(0.966 0.012 240)',
        },
        // A street-map palette: sky-blue water, mint land, and borders a shade darker than the land.
        water: {
          fillStyle: '#88CFE3',
        },
        land: {
          fillStyle: '#C4EBD5',
          strokeStyle: '#A7DBBE',
        },
        border: {
          strokeStyle: '#9CCFB1',
        },
        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: LINE_COLOR,
        },
        // Small so dense clusters (a city's data centres) stay separate dots rather than merging into a blob.
        point: {
          pointRadius: 1.5,
          fillStyle: POINT_COLOR,
        },
        selected: {
          pointRadius: 4,
          fillStyle: SELECTED_COLOR,
          strokeStyle: SELECTED_RING,
          lineWidth: 2,
        },
      };
