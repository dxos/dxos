//
// Copyright 2026 DXOS.org
//

import { type DiagramSet } from './diagrams.ts';

/** Composer: the overview, whose framework, data, plugin and compute boxes open their own diagrams; the data stack's echo-host opens a third level. */
export const composerDiagrams = (files: DiagramSet['files']): DiagramSet => ({
  root: 'composer',
  files,
  names: {
    'composer': 'Composer',
    'composer-framework': 'App Framework',
    'composer-data': 'Data Stack',
    'composer-plugin': 'Plugin Anatomy',
    'composer-compute': 'Compute',
    'composer-echo': 'echo-host',
  },
  drills: {
    'composer': {
      Framework: 'composer-framework',
      Services: 'composer-data',
      FeaturePlugins: 'composer-plugin',
      Compute: 'composer-compute',
    },
    'composer-data': {
      EchoHost: 'composer-echo',
    },
  },
});

/** EDGE: the overview, whose router, db, compute and hub boxes open their own diagrams; db-service's replication opens a third level. */
export const edgeDiagrams = (files: DiagramSet['files']): DiagramSet => ({
  root: 'edge',
  files,
  names: {
    'edge': 'EDGE',
    'edge-router': 'Router',
    'edge-db': 'db-service',
    'edge-compute': 'compute-service',
    'edge-hub': 'hub-service',
    'edge-subduction': 'Subduction',
  },
  drills: {
    'edge': {
      Router: 'edge-router',
      Db: 'edge-db',
      Compute: 'edge-compute',
      Hub: 'edge-hub',
    },
    'edge-db': {
      Subduction: 'edge-subduction',
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

/** Composer with EDGE beneath it: the Composer overview's EDGE box opens the EDGE overview and everything under it. */
export const architectureDiagrams = (files: Record<string, string>): DiagramSet => {
  const composer = composerDiagrams(diagramFiles(files, 'composer'));
  const edge = edgeDiagrams(diagramFiles(files, 'edge'));
  return {
    root: composer.root,
    files: { ...composer.files, ...edge.files },
    names: { ...composer.names, ...edge.names },
    drills: {
      ...composer.drills,
      ...edge.drills,
      [composer.root]: { ...composer.drills[composer.root], Edge: edge.root },
    },
  };
};
