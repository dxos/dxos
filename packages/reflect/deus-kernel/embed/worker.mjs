//
// Copyright 2026 DXOS.org
//

import image from './app.image';
import wasm from './deus_kernel.wasm';
// A Cloudflare Worker that serves a DEUS actor (`Request -> {Storage, Http, IO} Response`) from a
// Durable Object (P7, D45). `deus build --worker` writes this file next to the kernel and the
// actor's image; the actor's abilities are answered here, by IRI.
import { createKernel, run } from './kernel.mjs';

const STORAGE = 'urn:deus:cloudflare:Storage';
const HTTP = 'urn:deus:cloudflare:Http';
const REQUEST = 'urn:deus:cloudflare:Request';
const RESPONSE = 'urn:deus:cloudflare:Response';
const IO = '#IO';
const none = { $: '#Option', tag: 0, fields: [] };
const some = (value) => ({ $: '#Option', tag: 1, fields: [value] });

let kernel;

export class DeusActor {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const payload = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
    kernel ??= await createKernel(wasm);
    const result = await run(kernel, image, {
      argument: { $: REQUEST, tag: 0, fields: [request.method, url.pathname + url.search, payload] },
      handle: (ability, op, args) => this.handle(ability, op, args),
    });
    if (result.state !== 'done') {
      return Response.json(result, { status: 500 });
    }
    const [status, content] = result.value.fields;
    return new Response(content, { status });
  }

  async handle(ability, op, args) {
    if (ability === STORAGE) {
      switch (op) {
        case 0: {
          const value = await this.ctx.storage.get(args[0]);
          return value === undefined ? none : some(value);
        }
        case 1:
          await this.ctx.storage.put(args[0], args[1]);
          return null;
        case 2:
          return await this.ctx.storage.delete(args[0]);
      }
    }
    if (ability === HTTP && op === 0) {
      const [method, url, payload] = args[0].fields;
      const response = await fetch(url, { method, body: method === 'GET' || method === 'HEAD' ? undefined : payload });
      return { $: RESPONSE, tag: 0, fields: [response.status, await response.text()] };
    }
    if (ability === IO && (op === 0 || op === 1)) {
      console.log(args[0]);
      return null;
    }
    if (ability === IO && op === 15) {
      return String(BigInt(Date.now()) * 1000000n);
    }
    throw new Error(`the Worker does not provide ${ability} operation ${op}`);
  }
}

export default {
  /** Routes to the Durable Object named by `?actor=` (default: "default"). */
  async fetch(request, env) {
    const name = new URL(request.url).searchParams.get('actor') ?? 'default';
    return env.ACTOR.get(env.ACTOR.idFromName(name)).fetch(request);
  },
};
