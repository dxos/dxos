//
// Copyright 2026 DXOS.org
//

// The brand's background art, one per topic of the suite. EDGE is drawn with the KUBE mark and SAGE with DXNS, as the
// docs do, since the brand has no marks of their own yet.
import sage from '@dxos/brand/assets/backgrounds/bg-dxns-center.svg?raw';
import echo from '@dxos/brand/assets/backgrounds/bg-echo-center.svg?raw';
import halo from '@dxos/brand/assets/backgrounds/bg-halo-center.svg?raw';
import edge from '@dxos/brand/assets/backgrounds/bg-kube-center.svg?raw';
import mesh from '@dxos/brand/assets/backgrounds/bg-mesh-center.svg?raw';
import plex from '@dxos/brand/assets/backgrounds/bg-plex-center.svg?raw';
import tile from '@dxos/brand/assets/backgrounds/bg-tile-center.svg?raw';

export type SuiteTopic = {
  /** The mark's name, which is also the card's title. */
  label: string;
  /** The line art's color; the art ships in an arbitrary one, so every card restates its own. */
  color: string;
  description: string;
  art: string;
};

/** The suite as the docs home presents it, in its card order; ECHO leads and takes two columns. */
export const SUITE: SuiteTopic[] = [
  {
    label: 'ECHO',
    color: 'rgb(20,117,79)',
    description:
      'Realtime graph database: the context memory for teams and agents. Plugins add CRDTs, blobs, hierarchical feeds and RDF.',
    art: echo,
  },
  {
    label: 'HALO',
    color: 'rgb(201,138,30)',
    description: 'Decentralized identity, with keys on your devices.',
    art: halo,
  },
  {
    label: 'MESH',
    color: 'rgb(30,99,139)',
    description: 'Peer-to-peer networking that links devices directly.',
    art: mesh,
  },
  {
    label: 'PLEX',
    color: 'rgb(124,96,186)',
    description: 'Extensible app framework where everything is a plugin.',
    art: plex,
  },
  {
    label: 'TILE',
    color: 'rgb(150,37,79)',
    description: 'Design system of accessible, reactive components.',
    art: tile,
  },
  {
    label: 'EDGE',
    color: 'rgb(217,91,60)',
    description: 'Always-on cloud peer for sync, backup and compute.',
    art: edge,
  },
  {
    label: 'SAGE',
    color: 'rgb(122,150,112)',
    description: 'AI agents with their own identity, tools and skills.',
    art: sage,
  },
];

/**
 * One topic's art as a markdown image source. An `<img>` renders its SVG as a document of its own, so the art's
 * `--dx-bg-*` variables never reach it and its own fallbacks stand: the dark panel, the white mark, and the lines in
 * the `color` this rewrites to the topic's.
 */
export const suiteImage = ({ color, art }: SuiteTopic): string =>
  `data:image/svg+xml,${encodeURIComponent(art.replace(/(<svg [^>]*?) color="[^"]*"/, `$1 color="${color}"`))}`;
