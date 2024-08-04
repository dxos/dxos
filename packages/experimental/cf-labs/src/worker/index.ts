//
// Copyright 2024 DXOS.org
//

import type { Request as WorkerRequest, ExecutionContext } from '@cloudflare/workers-types/experimental';
import { HypercoreFactory } from '@dxos/hypercore';
import { next } from '@dxos/automerge/automerge';
import util from 'node:util';
import { length } from 'effect/Array';
import { sleep } from '@dxos/async';

export default {
  fetch: async (request: WorkerRequest, env: any, ctx: ExecutionContext) => {
    const factory = new HypercoreFactory();
    const core = factory.createFeed(Buffer.from('1111111111111111111111111111111111111111'), {
      secretKey: Buffer.from('secret'),
      crypto: {
        sign: (message: Buffer, secretKey: any, cb: (err: any, msg: any) => void) => {
          cb(null, message);
        },

        verify: async (message, signature, key, cb) => {
          cb(null, true);
        },
      },
      noiseKeyPair: {}, // We're not using noise.
    });

    const open = util.promisify(core.open.bind(core));
    await open;

    console.log({ length: core.length });

    const append = util.promisify(core.append.bind(core));

    const seq = await append('test');
    console.log({ seq, length: core.length });

    console.log('feed', core.key);

    const replicationStream = core.replicate(true, {
      live: true,
      upload: true,
      download: true,
      noise: false,
      encrypted: false,
      maxRequests: 1024,
    });

    let resp = '';
    replicationStream.on('data', (msg) => {
      resp += msg.toString('hex');
    });

    await sleep(500);

    return new Response(resp);
  },
};
