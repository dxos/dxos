//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export namespace AttentionEvents {
  /** @deprecated Ordering-only; declare a `requires: [AttentionCapabilities.Attention]` dependency instead. */
  export const AttentionReady = ActivationEvent.make(`${meta.profile.key}.event.attentionReady`);
}
