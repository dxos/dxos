//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

export default defineFunction({
  key: 'dxos.org/function/assistant-analysis',
  name: 'Assistant analysis',
  description: 'Enter analysis analysis mode.',
  inputSchema: Schema.Struct({
    enable: Schema.Boolean.annotations({ description: 'Enable or disable analysis mode.' }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ context, data: { enable } }) {
    log.info('analysis mode', { space: context.space?.id, enable });
  }),
});
