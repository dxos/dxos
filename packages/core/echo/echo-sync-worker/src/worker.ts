//
// Copyright 2026 DXOS.org
//

// The Worker entry. The runtime reads every export of this module as a handler or a Durable Object
// class, so it exports those and nothing else; the library surface is `index.ts`.

import { handleRequest } from './index.ts';

export { SpaceObject } from './space-object.ts';

export default { fetch: handleRequest };
