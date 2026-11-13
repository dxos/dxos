//
// Copyright 2026 DXOS.org
//

// The alt 4 brand suite's hero art, one per docs topic, with the mark on the right [D-251].
// TODO(wittjosiah): Move these into `@dxos/brand` once the suite is final [F-2.3].
import echo from '../../assets/topic-nav/suite/bg-echo.svg?raw';
import edge from '../../assets/topic-nav/suite/bg-edge.svg?raw';
import halo from '../../assets/topic-nav/suite/bg-halo.svg?raw';
import mesh from '../../assets/topic-nav/suite/bg-mesh.svg?raw';
import plex from '../../assets/topic-nav/suite/bg-plex.svg?raw';
import sage from '../../assets/topic-nav/suite/bg-sage.svg?raw';
import tile from '../../assets/topic-nav/suite/bg-tile.svg?raw';

export const SUITE_BACKGROUNDS = { echo, edge, halo, mesh, plex, sage, tile } as const;

export type SuiteTopic = keyof typeof SUITE_BACKGROUNDS;

/** The docs home's card order; ECHO's card is two wide, so seven cards fill two rows of four [D-250]. */
export const SUITE_ORDER: SuiteTopic[] = ['echo', 'halo', 'mesh', 'plex', 'tile', 'edge', 'sage'];
