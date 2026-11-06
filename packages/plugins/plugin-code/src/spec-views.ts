//
// Copyright 2026 DXOS.org
//

import type * as SpecSession from '@dxos/plugin-projects/SpecSession';

/** The views of a spec this plugin draws for any spec, by the companion tab each is one of. */
export const SPEC_VIEWS = [
  { id: 'definitions', group: 'structure', icon: 'ph--tree-structure--regular' },
  { id: 'related', group: 'structure', icon: 'ph--crosshair--regular' },
  { id: 'data', group: 'structure', icon: 'ph--database--regular' },
  { id: 'api', group: 'structure', icon: 'ph--plugs-connected--regular' },
  { id: 'log', group: 'decisions', icon: 'ph--users-three--regular' },
  { id: 'decisions', group: 'decisions', icon: 'ph--graph--regular' },
  { id: 'review', group: 'review', icon: 'ph--seal-check--regular' },
  { id: 'code', group: 'review', icon: 'ph--file-code--regular' },
] as const satisfies readonly { id: string; group: SpecSession.Group; icon: string }[];

export type SpecViewId = (typeof SPEC_VIEWS)[number]['id'];

export const isSpecView = (value: string): value is SpecViewId => SPEC_VIEWS.some(({ id }) => id === value);

/** The feature map's views, for specs using the features dialect. */
export const FEATURE_VIEWS = [
  { id: 'canvas', icon: 'ph--graph--regular' },
  { id: 'kanban', icon: 'ph--kanban--regular' },
] as const;

export type FeatureViewId = (typeof FEATURE_VIEWS)[number]['id'];

export const isFeatureView = (value: string): value is FeatureViewId => FEATURE_VIEWS.some(({ id }) => id === value);
