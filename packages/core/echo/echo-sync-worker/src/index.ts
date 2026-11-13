//
// Copyright 2026 DXOS.org
//

import { SpaceId } from '@dxos/keys';

import { type SpaceEnv } from './space-object.ts';

export * from './space-object.ts';

export type Env = SpaceEnv & {
  /** Bound only when a deployment also serves an app; the sync server alone has none. */
  readonly ASSETS?: { fetch(request: Request): Promise<Response> };
};

/** The space's sync socket; the path is the one `socketPath` in `@dxos/echo-sqlite/sync` builds. */
const SOCKET_PATH = /^\/api\/space\/([^/]+)\/socket$/;

const LANDING = `echo sync server

GET /api/space/<spaceId>/socket  WebSocket: the feed sync protocol, one authority per space
`;

/** Routes a space's socket to its Durable Object; everything else is the app, if one is bound. */
export const handleRequest = async (request: Request, env: Env): Promise<Response> => {
  const { pathname } = new URL(request.url);

  const match = SOCKET_PATH.exec(pathname);
  if (match) {
    const spaceId = match[1];
    if (!SpaceId.isValid(spaceId)) {
      return new Response('Invalid space id', { status: 400 });
    }
    // Addressing the object is what creates the space on the server: there is no create step.
    const stub = env.SPACE.get(env.SPACE.idFromName(spaceId));
    return stub.fetch(request);
  }

  if (pathname.startsWith('/api/')) {
    return new Response('Not found', { status: 404 });
  }

  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }

  return pathname === '/' ? new Response(LANDING) : new Response('Not found', { status: 404 });
};
