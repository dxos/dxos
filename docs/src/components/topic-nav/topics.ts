//
// Copyright 2026 DXOS.org
//

import echo from '../../../../packages/ui/brand/assets/logotypes/echo-horizontal-black.svg?raw';
import halo from '../../../../packages/ui/brand/assets/logotypes/halo-horizontal-black.svg?raw';
import mesh from '../../../../packages/ui/brand/assets/logotypes/mesh-horizontal-black.svg?raw';
// The brand has no logotypes in the alt 4 suite's marks yet [D-273]; these are drawn to the brand logotypes' frame.
import edge from '../../assets/topic-nav/logotypes/edge-horizontal-black.svg?raw';
import plex from '../../assets/topic-nav/logotypes/plex-horizontal-black.svg?raw';
import sage from '../../assets/topic-nav/logotypes/sage-horizontal-black.svg?raw';
import tile from '../../assets/topic-nav/logotypes/tile-horizontal-black.svg?raw';

/** The logotype's mark is outlined in black; the label's color replaces it, as it does the unset fill. */
const inherit = (svg: string) => svg.replace(/stroke:black/g, 'stroke:currentColor');

export type Topic = {
  id: string;
  label: string;
  /** Unset for a topic with no pages yet. */
  href?: string;
  description: string;
  logotype?: string;
};

/** Every docs topic, built or planned, in nav order. */
export const TOPICS: Topic[] = [
  {
    id: 'echo',
    label: 'ECHO',
    href: '/docs/echo/overview/',
    description: 'Local-first database: objects, queries, sync.',
    logotype: inherit(echo),
  },
  {
    id: 'halo',
    label: 'HALO',
    href: '/docs/halo/overview/',
    description: 'Identity, devices and access control.',
    logotype: inherit(halo),
  },
  {
    id: 'mesh',
    label: 'MESH',
    href: '/docs/mesh/overview/',
    description: 'Peer-to-peer networking and replication.',
    logotype: inherit(mesh),
  },
  {
    id: 'edge',
    label: 'EDGE',
    href: '/docs/edge/overview/',
    description: 'Always-online backup, indexing and compute.',
    logotype: inherit(edge),
  },
  {
    id: 'sage',
    label: 'SAGE',
    href: '/docs/sage/overview/',
    description: 'Durable agents, tools, skills and models.',
    logotype: inherit(sage),
  },
  {
    id: 'plex',
    label: 'PLEX',
    href: '/docs/plex/overview/',
    description: 'An app framework where everything is a plugin.',
    logotype: inherit(plex),
  },
  {
    id: 'tile',
    label: 'TILE',
    href: '/docs/tile/overview/',
    description: 'Design system and UI components.',
    logotype: inherit(tile),
  },
];

/** The topic whose pages hold `pathname`. */
export const currentTopic = (pathname: string): Topic | undefined =>
  TOPICS.find((topic) => pathname.startsWith(`/docs/${topic.id}/`) || pathname === `/docs/${topic.id}`);
