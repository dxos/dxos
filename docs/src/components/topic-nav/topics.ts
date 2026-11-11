//
// Copyright 2026 DXOS.org
//

import echo from '../../../../packages/ui/brand/assets/logotypes/echo-horizontal-black.svg?raw';
import edge from '../../../../packages/ui/brand/assets/logotypes/edge-horizontal-black.svg?raw';
import halo from '../../../../packages/ui/brand/assets/logotypes/halo-horizontal-black.svg?raw';
import mesh from '../../../../packages/ui/brand/assets/logotypes/mesh-horizontal-black.svg?raw';
import plex from '../../../../packages/ui/brand/assets/logotypes/plex-horizontal-black.svg?raw';

// The brand has no TILE logotype yet; this is the exploration's proposal, drawn to the other logotypes' frame.
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
  /** A square mark drawn beside the label, for a topic with no logotype. */
  icon?: string;
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
    description: 'Identity, devices and access.',
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
    id: 'plex',
    label: 'PLEX',
    href: '/docs/plex/overview/',
    description: 'Plugin framework for Composer-style apps.',
    logotype: inherit(plex),
  },
  {
    id: 'edge',
    label: 'EDGE',
    href: '/docs/edge/overview/',
    description: 'Hosted services: sync, functions, agents.',
    logotype: inherit(edge),
  },
  {
    id: 'tile',
    label: 'TILE',
    href: '/docs/tile/overview/',
    description: 'React components and the design system.',
    logotype: inherit(tile),
  },
];

/** The topic whose pages hold `pathname`. */
export const currentTopic = (pathname: string): Topic | undefined =>
  TOPICS.find((topic) => pathname.startsWith(`/docs/${topic.id}/`) || pathname === `/docs/${topic.id}`);

/** The switcher designs under comparison; `?nav=<id>` picks one and the choice persists. */
export const NAV_VARIANTS = [
  { id: 'sidebar', label: 'Today' },
  { id: 'logo-menu', label: 'Logo menu' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'sidebar-select', label: 'Sidebar picker' },
  { id: 'docs-menu', label: 'Docs menu' },
  { id: 'effect-tabs', label: 'Effect, tabs to picker' },
  { id: 'effect-picker', label: 'Effect picker' },
] as const;

export type NavVariant = (typeof NAV_VARIANTS)[number]['id'];

export const DEFAULT_NAV_VARIANT: NavVariant = 'sidebar';
