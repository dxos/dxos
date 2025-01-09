//
// Copyright 2025 DXOS.org
//

import { defineInterface } from '@dxos/app-framework/next';
import { type AttentionManager } from '@dxos/react-ui-attention';

import { ATTENTION_PLUGIN } from './meta';

export namespace AttentionCapabilities {
  export const Attention = defineInterface<AttentionManager>(`${ATTENTION_PLUGIN}/contributions/attention`);
}
