//
// Copyright 2025 DXOS.org
//

import { defineFunction, S } from 'dxos:functions';

export default defineFunction({
  key: 'dxos.org/function/inbox/hello',
  name: 'Hello',
  inputSchema: S.Any,
  handler: ({ event: { data }, context }: any) => {
    // eslint-disable-next-line no-console
    console.log(context);
    return data;
  },
});
