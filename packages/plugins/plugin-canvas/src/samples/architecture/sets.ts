//
// Copyright 2026 DXOS.org
//

import { type DiagramSet } from './diagrams.ts';

/** Composer: the overview, whose framework, data, plugin and compute boxes open their own diagrams; the data stack's echo-host opens a third level. */
export const composerDiagrams = (diagrams: DiagramSet['diagrams']): DiagramSet => ({
  root: 'composer',
  diagrams,
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
export const edgeDiagrams = (diagrams: DiagramSet['diagrams']): DiagramSet => ({
  root: 'edge',
  diagrams,
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

/** The diagrams of one set (the ids `prefix` names, or starts with `prefix-`). */
export const diagramFiles = (diagrams: DiagramSet['diagrams'], prefix: string): DiagramSet['diagrams'] =>
  Object.fromEntries(Object.entries(diagrams).filter(([id]) => id === prefix || id.startsWith(`${prefix}-`)));

/** Composer with EDGE beneath it: the Composer overview's EDGE box opens the EDGE overview and everything under it. */
export const architectureDiagrams = (diagrams: DiagramSet['diagrams']): DiagramSet => {
  const composer = composerDiagrams(diagramFiles(diagrams, 'composer'));
  const edge = edgeDiagrams(diagramFiles(diagrams, 'edge'));
  return {
    root: composer.root,
    diagrams: { ...composer.diagrams, ...edge.diagrams },
    names: { ...composer.names, ...edge.names },
    drills: {
      ...composer.drills,
      ...edge.drills,
      [composer.root]: { ...composer.drills[composer.root], Edge: edge.root },
    },
  };
};
