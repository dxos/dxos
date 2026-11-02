//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { ProjectsNamespace } from './namespace.ts';

/** Picks an existing feature to add to a spec's map. */
export const ADD_FEATURE_DIALOG = DXN.make(`${ProjectsNamespace.key}.addFeatureDialog`);

export const MOVE_TASK_DIALOG = DXN.make(`${ProjectsNamespace.key}.moveTaskDialog`);

/** The spec plank's companion that shows the feature selected on its feature map. */
export const FEATURE_COMPANION = 'feature';
