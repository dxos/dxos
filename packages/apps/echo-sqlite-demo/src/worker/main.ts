//
// Copyright 2026 DXOS.org
//

// The sync server and the app in one deployment: `/api/*` reaches the Durable Object, everything else
// is served from the `ASSETS` binding. `@dxos/echo-sync-worker` deploys the same server on its own.
// The runtime reads every export here as a handler or a Durable Object class, so there is nothing else.

import { handleRequest } from '@dxos/echo-sync-worker';

export { SpaceObject } from '@dxos/echo-sync-worker';

export default { fetch: handleRequest };
