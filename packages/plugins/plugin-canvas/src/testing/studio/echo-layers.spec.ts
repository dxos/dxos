//
// Copyright 2026 DXOS.org
//

//
// The ECHO slide: what each layer holds, in four columns, with the runtimes it runs on boxed off at the right. The
// slide draws no edges — the columns are the statement.
//

import { type SlideSpec } from './spec.ts';

const card = (id: string, label: string, icon: string) => ({ id, label, icon });

export const ECHO_LAYERS: SlideSpec = {
  id: 'echo-layers',
  title: 'ECHO',
  // No captions to make room for, so the columns stand closer than a slide whose edges carry labels.
  metrics: { columnGap: 96, groupGap: 128 },
  groups: [
    {
      id: 'layers',
      columns: [
        [
          card('graph', 'Graph', 'graph'),
          card('crdt', 'CRDT', 'git-merge'),
          card('pipeline', 'Pipeline', 'flow-arrow'),
        ],
        [
          card('types', 'Types', 'brackets-curly'),
          card('feeds', 'Feeds', 'queue'),
          card('sync', 'Sync', 'arrows-clockwise'),
          card('index', 'Index', 'list-magnifying-glass'),
        ],
        [card('blobs', 'Blobs', 'files'), card('cache', 'Cache', 'lightning'), card('memory', 'Memory', 'brain')],
      ],
    },
    {
      id: 'runtime',
      heading: 'Runtime',
      box: true,
      columns: [
        [
          card('browser', 'Browser', 'browser'),
          card('node', 'Node', 'terminal-window'),
          card('worker', 'Worker', 'cloud'),
        ],
      ],
    },
  ],
};
