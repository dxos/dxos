//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AttentionEvents {
  export const AttentionReady = defineEvent(`${meta.id}/event/attention-ready`);
}
