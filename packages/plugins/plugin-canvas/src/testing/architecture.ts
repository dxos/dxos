//
// Copyright 2026 DXOS.org
//

import { type DiagramSet } from './diagrams.ts';

/** Composer: the overview, whose framework, data, plugin and compute boxes open their own diagrams. */
export const composerDiagrams = (files: DiagramSet['files']): DiagramSet => ({
  root: 'composer',
  files,
  names: {
    'composer': 'Composer',
    'composer-framework': 'App Framework',
    'composer-data': 'Data Stack',
    'composer-plugin': 'Plugin Anatomy',
    'composer-compute': 'Compute',
  },
  drills: {
    composer: {
      Framework: 'composer-framework',
      Services: 'composer-data',
      FeaturePlugins: 'composer-plugin',
      Compute: 'composer-compute',
    },
  },
});

/** EDGE: the overview, whose router, db, compute and hub boxes open their own diagrams. */
export const edgeDiagrams = (files: DiagramSet['files']): DiagramSet => ({
  root: 'edge',
  files,
  names: {
    'edge': 'EDGE',
    'edge-router': 'Router',
    'edge-db': 'db-service',
    'edge-compute': 'compute-service',
    'edge-hub': 'hub-service',
  },
  drills: {
    edge: {
      Router: 'edge-router',
      Db: 'edge-db',
      Compute: 'edge-compute',
      Hub: 'edge-hub',
    },
  },
});

/** The files of one set out of a map keyed by path, by diagram id (the basename without `.dx.svg`). */
export const diagramFiles = (files: Record<string, string>, prefix: string): DiagramSet['files'] =>
  Object.fromEntries(
    Object.entries(files)
      .map(([path, text]): [string, string] => [path.replace(/^.*\//, '').replace(/\.dx\.svg$/, ''), text])
      .filter(([id]) => id === prefix || id.startsWith(`${prefix}-`)),
  );
