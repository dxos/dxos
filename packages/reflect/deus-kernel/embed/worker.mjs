//
// Copyright 2026 DXOS.org
//

import image from './app.image';
import wasm from './deus_kernel.wasm';
// A Cloudflare Worker that serves a DEUS actor (`Request -> {Storage, Http, Actors, Alarm, IO} Response`) from a
// Durable Object (P7, D45). `deus build --worker` writes this file next to the kernel and the
// actor's image; the actor's abilities are answered here, by IRI.
import { createKernel, run } from './kernel.mjs';

const STORAGE = 'urn:deus:web:Storage';
const HTTP = 'urn:deus:web:Http';
const ACTORS = 'urn:deus:web:Actors';
const ALARM = 'urn:deus:web:Alarm';
const REQUEST = 'urn:deus:web:Request';
const RESPONSE = 'urn:deus:web:Response';
const IO = 'urn:deus:builtin:IO';
const none = { $: 'urn:deus:builtin:Option', tag: 0, fields: [] };
const some = (value) => ({ $: 'urn:deus:builtin:Option', tag: 1, fields: [value] });

// Idle kernels. A run suspended on an operation keeps its kernel, and another run (this object's
// or, on one isolate, another object's) may start meanwhile, so each run takes its own.
const idle = [];

export class DeusActor {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    url.searchParams.delete('actor');
    const payload = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
    const [status, content, headers] = await this.serve([request.method, url.pathname + url.search, payload]);
    return new Response(content, { status, headers: headers.map((pair) => pair.fields) });
  }

  /** Delivers the alarm `Alarm.set` scheduled as an `ALARM /alarm` request. */
  async alarm() {
    await this.serve(['ALARM', '/alarm', '']);
  }

  /** Runs the actor on one request's fields; returns the response's (status, content). */
  async serve(fields) {
    const kernel = idle.pop() ?? (await createKernel(wasm));
    try {
      const result = await run(kernel, image, {
        argument: { $: REQUEST, tag: 0, fields },
        handle: (ability, op, args) => this.handle(ability, op, args),
      });
      return result.state === 'done' ? result.value.fields : [500, JSON.stringify(result), []];
    } finally {
      idle.push(kernel);
    }
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
      return { $: RESPONSE, tag: 0, fields: [response.status, await response.text(), []] };
    }
    if (ability === ACTORS && op === 0) {
      // Another object of this class, by name; the request goes to its `fetch`.
      const [method, url, payload] = args[1].fields;
      const stub = this.env.ACTOR.get(this.env.ACTOR.idFromName(args[0]));
      const response = await stub.fetch(
        new Request(`https://actor${url}`, {
          method,
          body: method === 'GET' || method === 'HEAD' ? undefined : payload,
        }),
      );
      return { $: RESPONSE, tag: 0, fields: [response.status, await response.text(), []] };
    }
    if (ability === ALARM && op === 0) {
      // A `Duration` (whole seconds, then milliseconds), or bare milliseconds from images built before it.
      const delay = typeof args[0] === 'number' ? args[0] : args[0].fields[0] * 1000 + args[0].fields[1];
      await this.ctx.storage.setAlarm(Date.now() + Math.max(0, delay));
      return null;
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
