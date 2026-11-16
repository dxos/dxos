//
// Copyright 2026 DXOS.org
//

import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import type * as SpecSession from '@dxos/plugin-projects/SpecSession';

import { FEATURE_STATUS_STYLE } from './components/FeatureCard/fields.tsx';

/**
 * The views of a spec this plugin draws for the software dialect, by the companion tab each is one of: its data model
 * and API, and the code a review cites.
 */
export const SPEC_VIEWS = [
  { id: 'data', group: 'structure', icon: 'ph--database--regular' },
  { id: 'api', group: 'structure', icon: 'ph--plugs-connected--regular' },
  { id: 'code', group: 'review', icon: 'ph--file-code--regular' },
] as const satisfies readonly { id: string; group: SpecSession.Group; icon: string }[];

export type SpecViewId = (typeof SPEC_VIEWS)[number]['id'];

export const isSpecView = (value: string): value is SpecViewId => SPEC_VIEWS.some(({ id }) => id === value);

/** The feature map's board, for specs using the software dialect. */
export const FEATURE_VIEWS = [{ id: 'kanban', icon: 'ph--kanban--regular' }] as const;

export type FeatureViewId = (typeof FEATURE_VIEWS)[number]['id'];

export const isFeatureView = (value: string): value is FeatureViewId => FEATURE_VIEWS.some(({ id }) => id === value);

/** A feature's status as the feature map draws it, on its definition card; any other block's `status` plain. */
export const SOFTWARE_FACTS: ProjectCapabilities.SpecFacts = { status: FEATURE_STATUS_STYLE };
