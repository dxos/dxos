//
// Copyright 2026 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

export type SpaceEnv = {
  /** One object per space, keyed by space id. */
  readonly SPACE: DurableObjectNamespace<SpaceObject>;
  /** Where the bytes live. */
  readonly SPACES: R2Bucket;
};

/** A demo bound, well under R2's limits; a space this size is past what the demo is showing. */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * The authority for one space.
 *
 * A Durable Object is single-threaded and there is exactly one per space id, so concurrent pushes
 * queue here instead of racing in R2 — which is the whole reason the DO is in the path rather than
 * the Worker writing to R2 directly. R2 holds the file: Durable Object KV values cap at 128 KiB,
 * and DO SQLite would mean chunking it across rows.
 *
 * It stores bytes, not objects. When `echo-sqlite` runs under workerd this object gains its own
 * database over `ctx.storage.sql` and the transport becomes feed-based sync, with no client change.
 */
export class SpaceObject extends DurableObject<SpaceEnv> {
  override async fetch(request: Request): Promise<Response> {
    const spaceId = new URL(request.url).pathname.split('/').pop();
    if (!spaceId) {
      return new Response('Missing space id', { status: 400 });
    }

    switch (request.method) {
      case 'GET': {
        const object = await this.env.SPACES.get(spaceId);
        if (!object) {
          return new Response('No stored database for this space', { status: 404 });
        }
        return new Response(object.body, {
          headers: {
            'content-type': 'application/octet-stream',
            'cache-control': 'no-store',
            'etag': object.httpEtag,
          },
        });
      }

      case 'PUT': {
        const body = await request.arrayBuffer();
        if (body.byteLength === 0) {
          return new Response('Empty body', { status: 400 });
        }
        if (body.byteLength > MAX_BYTES) {
          return new Response(`Too large: ${body.byteLength} > ${MAX_BYTES}`, { status: 413 });
        }

        await this.env.SPACES.put(spaceId, body);
        const version = (this.ctx.storage.kv.get<number>('version') ?? 0) + 1;
        this.ctx.storage.kv.put('version', version);

        return Response.json({ bytes: body.byteLength, version });
      }

      default: {
        return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, PUT' } });
      }
    }
  }
}
