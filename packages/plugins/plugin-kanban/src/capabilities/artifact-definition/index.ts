//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ArtifactDefinition = Capability.lazy('ArtifactDefinition', () => import('./artifact-definition'));
