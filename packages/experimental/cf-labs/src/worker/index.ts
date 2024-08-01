//
// Copyright 2024 DXOS.org
//

import type { Request as WorkerRequest, ExecutionContext } from '@cloudflare/workers-types/experimental';
import { HypercoreFactory } from '@dxos/hypercore';
import { next } from '@dxos/automerge/automerge';

export default {
  fetch: async (request: WorkerRequest, env: any, ctx: ExecutionContext) => {
    const factory = new HypercoreFactory();
    const feed = factory.createFeed(Buffer.from('1111111111111111111111111111111111111111'));
    console.log('feed', feed.key);
    return new Response('Hello World!');
  },
};
