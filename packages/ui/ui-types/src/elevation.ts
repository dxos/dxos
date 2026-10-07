//
// Copyright 2022 DXOS.org
//

export type Elevation = 'base' | 'positioned' | 'toast' | 'dialog';
export type SurfaceLevel = 'base' | 'menu' | 'tooltip';

/** The surface ladder in `ui-theme/css/theme/surfaces.css`, low to high. */
export type Surface = 'sunken' | 'chrome' | 'base' | 'raised' | 'overlay' | 'popup';

/** An elevation as a number, Material-style: 0 sunken, 1 chrome, 2 base, 3 raised, 4 overlay, 5 popup. */
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;
