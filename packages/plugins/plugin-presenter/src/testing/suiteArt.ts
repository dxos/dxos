//
// Copyright 2026 DXOS.org
//

/**
 * The suite's background art, served from the brand asset bucket rather than bundled: `assets.dxos.org/brand/` mirrors
 * `packages/ui/brand/assets`, so a redrawn mark reaches a slide without a code change. EDGE is drawn with the brand's
 * KUBE mark and SAGE with DXNS, as the docs are, since neither has a mark of its own yet.
 *
 * Each card takes the crop cut for its width (`gen-card-art.mjs`). Every crop is the same height and centred on the
 * mark, so a card spanning two columns fills its width without drawing its mark any larger than its neighbours'.
 *
 * An `<img>` renders an SVG as a document of its own, so the art's `--dx-bg-*` variables never reach it and its own
 * fallbacks stand: the dark panel, the white mark, and the lines in each file's own `color`.
 */
const BRAND_ART = 'https://assets.dxos.org/brand/backgrounds/cards';

export type SuiteTopic = {
  /** The mark's name, which is also the card's title. */
  label: string;
  description: string;
  /** The columns the card covers; it takes the crop cut for that width. */
  colSpan: number;
  /** The hosted art, as a markdown image source. */
  image: string;
};

const topic = (label: string, mark: string, description: string, colSpan = 1): SuiteTopic => ({
  label,
  description,
  colSpan,
  image: `${BRAND_ART}/${mark}-${colSpan}x.svg`,
});

/** The suite as the docs home presents it, in its card order; ECHO leads and takes two columns. */
export const SUITE: SuiteTopic[] = [
  topic(
    'ECHO',
    'echo',
    'Realtime graph database: the context memory for teams and agents. Plugins add CRDTs, blobs, hierarchical feeds and RDF.',
    2,
  ),
  topic('HALO', 'halo', 'Decentralized identity, with keys on your devices.'),
  topic('MESH', 'mesh', 'Peer-to-peer networking that links devices directly.'),
  topic('PLEX', 'plex', 'Extensible app framework where everything is a plugin.'),
  topic('TILE', 'tile', 'Design system of accessible, reactive components.'),
  topic('EDGE', 'kube', 'Always-on cloud peer for sync, backup and compute.'),
  topic('SAGE', 'dxns', 'AI agents with their own identity, tools and skills.'),
];
