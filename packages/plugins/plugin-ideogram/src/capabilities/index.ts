//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Connector = Capability.lazy('Connector', () => import('./connector'));
export const ImageGenerationService = Capability.lazy(
  'ImageGenerationService',
  () => import('./image-generation-service'),
);
