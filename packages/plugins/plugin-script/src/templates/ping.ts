//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'dxos.org/script/ping',
  name: 'Ping',
  inputSchema: Schema.Any,

  handler: async ({ data }) => {
    return data;
  },
});
