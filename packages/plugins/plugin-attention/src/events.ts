//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework/next';

import { ATTENTION_PLUGIN } from './meta';

export namespace AttentionEvents {
  export const AttentionReady = defineEvent(`${ATTENTION_PLUGIN}/events/attention-ready`);
}
