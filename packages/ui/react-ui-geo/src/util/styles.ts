//
// Copyright 2026 DXOS.org
//

import { type ThemeMode } from '@dxos/react-ui';

import { type StyleSet } from './render';

/**
 * Default style set for the Globe, theme-aware. Originated in plugin-map's
 * GlobeControl; lifted here so other plugins (plugin-trip, etc.) get the same
 * baseline without copying the palette.
 */
// Point colour; lines pick up the same colour at reduced alpha so the route
// reads as belonging to the same node set without competing with the nodes.
const POINT_COLOR = 'rgb(220, 38, 38)';
const LINE_COLOR = 'rgba(220, 38, 38, 0.5)';

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
        point: {
          radius: 0.2,
          fillStyle: POINT_COLOR,
        },
      }
    : {
        water: {
          fillStyle: '#fff',
        },
        land: {
          fillStyle: '#f5f5f5',
          strokeStyle: '#ccc',
        },
        graticule: {
          strokeStyle: '#ddd',
        },
        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: LINE_COLOR,
        },
        point: {
          radius: 0.2,
          fillStyle: POINT_COLOR,
        },
      };
