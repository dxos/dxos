//
// Copyright 2026 DXOS.org
//

//
// The ECHO slide: what each layer holds and where it runs, under a banner of what a type is. The slide draws no
// edges — the columns are the statement, and each card says the rest itself.
//

import { type SlideSpec } from './spec.ts';

const card = (id: string, label: string, icon: string, body: string, footer: string) => ({
  id,
  label,
  icon,
  body,
  footer,
});

export const ECHO_LAYERS: SlideSpec = {
  id: 'echo-layers',
  title: 'ECHO',
  // Wide enough for three lines of body at the deck's reading size; no captions to leave a lane for.
  metrics: { cardWidth: 368, bodyCardHeight: 176, columnGap: 64, groupGap: 96, bannerHeight: 160 },
  groups: [
    {
      id: 'layers',
      banner: {
        id: 'types',
        label: 'Types',
        icon: 'brackets-curly',
        chips: {
          cols: 3,
          flat: true,
          items: [
            { icon: 'shield-check', label: 'Validation', note: 'every write' },
            { icon: 'file-ts', label: 'TypeScript', note: 'Effect Schema' },
            { icon: 'brackets-angle', label: 'JSON Schema', note: 'agent tools' },
            { icon: 'link', label: 'URI', note: 'dxn:type:org.dxos/Task' },
            { icon: 'git-branch', label: 'Versioning', note: 'semver per type' },
            { icon: 'arrows-clockwise', label: 'Schema migration', note: 'lenses' },
          ],
        },
      },
      columns: [
        [
          card(
            'graph',
            'Graph',
            'graph',
            'Typed objects and relations: a property graph per space.',
            'one Automerge doc per object',
          ),
          card(
            'crdt',
            'CRDT',
            'git-merge',
            'Automerge: concurrent edits from people and agents merge deterministically.',
            'no locks · no primary',
          ),
          card(
            'pipeline',
            'Pipeline',
            'flow-arrow',
            'Triggers on queries, feeds, cron, webhooks and email run functions on each change.',
            'EDGE: Scheduler DO · alarms',
          ),
        ],
        [
          card(
            'feeds',
            'Feeds',
            'queue',
            'Append-only logs: chat, transcripts, agent trajectories.',
            'EDGE: FeedSpace DO',
          ),
          card(
            'sync',
            'Sync',
            'arrows-clockwise',
            'Subduction exchanges compacted history fragments by fingerprint.',
            'EDGE: replicator DO',
          ),
          card(
            'index',
            'Index',
            'list-magnifying-glass',
            'SQLite everywhere: typed queries, full-text search, reverse references. 0.4–1.8 ms at 10k objects.',
            'EDGE: Indexer DO · vectors planned',
          ),
        ],
        [
          card('blobs', 'Blobs', 'files', 'Files and binary content, referenced from objects.', 'EDGE: R2'),
          card(
            'cache',
            'Cache',
            'lightning',
            'A full replica on every device; reads never wait on the network.',
            'OPFS · KV fast path',
          ),
          card(
            'memory',
            'Memory',
            'brain',
            'Shared memory for people and agents: branches, provenance, facts and rules.',
            'EDGE: Agent DO · BrainObject',
          ),
        ],
      ],
    },
    {
      id: 'runtime',
      heading: 'Runtime',
      box: true,
      columns: [
        [
          card('browser', 'Browser', 'browser', 'Full replica in the tab; works offline.', 'wa-sqlite on OPFS'),
          card('node', 'Node', 'terminal-window', 'Agents, CLIs and servers.', 'native SQLite'),
          card('worker', 'Worker', 'cloud', 'Always-on peer, sync hub and index per space.', 'Workers · DO SQLite'),
        ],
      ],
    },
  ],
};
