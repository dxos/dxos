//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { ProjectsNamespace } from './namespace.ts';

export const MOVE_TASK_DIALOG = DXN.make(`${ProjectsNamespace.key}.moveTaskDialog`);

/** The spec plank's companion that shows the feature selected on its feature map. */
export const FEATURE_COMPANION = 'feature';

/** The spec plank's companion that shows the spec's `.mdl` document, which the spec owns and so lists nowhere else. */
export const SPEC_DOCUMENT_COMPANION = 'spec-document';
