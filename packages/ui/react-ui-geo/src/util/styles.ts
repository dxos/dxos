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
          strokeStyle: '#333',
        },
        point: {
          radius: 0.2,
          fillStyle: 'red',
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
          strokeStyle: '#333',
        },
        point: {
          radius: 0.2,
          fillStyle: 'red',
        },
      };
