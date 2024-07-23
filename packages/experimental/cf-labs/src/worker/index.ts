//
// Copyright 2024 DXOS.org
//

import type { Request as WorkerRequest, ExecutionContext } from '@cloudflare/workers-types/experimental';

export default {
  fetch: async (request: WorkerRequest, env: any, ctx: ExecutionContext) => {
    return new Response('Hello World!');
  },
};
