//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AttentionEvents {
  export const AttentionReady = ActivationEvent.make(`${meta.id}/event/attention-ready`);
}
