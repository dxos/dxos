//
// Copyright 2026 DXOS.org
//

/**
 * The module the workerd test pool runs, so `SpaceObject` is a real Durable Object under test.
 *
 * A Durable Object class must be exported by the worker that declares the binding; the tests then
 * address a stub themselves rather than through a router, so nothing between them and the object
 * can absorb a refusal.
 */

import type { SpaceEnv } from '@dxos/echo-sync-worker';

export { SpaceObject } from '@dxos/echo-sync-worker';

// The runtime requires a default export with a handler; the tests never reach it.
export default {
  fetch: (_request: Request, _env: SpaceEnv): Response => new Response('Not found', { status: 404 }),
};
