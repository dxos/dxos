//
// Copyright 2026 DXOS.org
//

/** Visualization variants exposed by `ExplorerArticle`. */
export type ExplorerArticleVariant = 'force' | 'cluster' | 'bundle' | 'lattice' | 'swarm';

export const VARIANTS: { value: ExplorerArticleVariant; icon: string; label: string }[] = [
  {
    value: 'force',
    icon: 'ph--graph--regular',
    label: 'Force-directed',
  },
  {
    value: 'cluster',
    icon: 'ph--asterisk-simple--regular',
    label: 'Radial',
  },
  {
    value: 'bundle',
    icon: 'ph--circles-three-plus--regular',
    label: 'Connections',
  },
  {
    value: 'lattice',
    icon: 'ph--grid-four--regular',
    label: 'Lattice',
  },
  {
    value: 'swarm',
    icon: 'ph--microscope--regular',
    label: 'Swarm',
  },
];

export const isVariant = (value: unknown): value is ExplorerArticleVariant =>
  value === 'force' || value === 'cluster' || value === 'bundle' || value === 'lattice' || value === 'swarm';
