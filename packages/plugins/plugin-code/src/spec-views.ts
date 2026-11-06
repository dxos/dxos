//
// Copyright 2026 DXOS.org
//

import type * as SpecSession from '@dxos/plugin-projects/SpecSession';

/** The dialect of types, operations, services and components, which the views reading code need. */
export const CODE_DIALECT = 'org.dxos.spec.code';

/**
 * The views of a spec this plugin draws, by the companion tab each is one of, and the dialects a spec must use to be
 * offered each: Definitions, Related and the decisions read any dialect's blocks; the rest read code, as a review
 * checks a spec's items against code.
 */
export const SPEC_VIEWS = [
  { id: 'definitions', group: 'structure', icon: 'ph--tree-structure--regular', dialects: [] },
  { id: 'related', group: 'structure', icon: 'ph--crosshair--regular', dialects: [] },
  { id: 'data', group: 'structure', icon: 'ph--database--regular', dialects: [CODE_DIALECT] },
  { id: 'api', group: 'structure', icon: 'ph--plugs-connected--regular', dialects: [CODE_DIALECT] },
  { id: 'cursor', group: 'decisions', icon: 'ph--crosshair--regular', dialects: [] },
  { id: 'ledger', group: 'decisions', icon: 'ph--list-checks--regular', dialects: [] },
  { id: 'review', group: 'review', icon: 'ph--seal-check--regular', dialects: [CODE_DIALECT] },
  { id: 'code', group: 'review', icon: 'ph--file-code--regular', dialects: [CODE_DIALECT] },
] as const satisfies readonly { id: string; group: SpecSession.Group; icon: string; dialects: readonly string[] }[];

export type SpecViewId = (typeof SPEC_VIEWS)[number]['id'];

export const isSpecView = (value: string): value is SpecViewId => SPEC_VIEWS.some(({ id }) => id === value);

/** The feature map's views, for specs using the features dialect. */
export const FEATURE_VIEWS = [
  { id: 'canvas', icon: 'ph--graph--regular' },
  { id: 'kanban', icon: 'ph--kanban--regular' },
] as const;

export type FeatureViewId = (typeof FEATURE_VIEWS)[number]['id'];

export const isFeatureView = (value: string): value is FeatureViewId => FEATURE_VIEWS.some(({ id }) => id === value);
