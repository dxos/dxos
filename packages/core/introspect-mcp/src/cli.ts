//
// Copyright 2026 DXOS.org
//

// TODO(burdon): Consider how to integrate with DXOS CLI.
// Direct CLI entry — invoked by `pnpm -F @dxos/introspect-mcp start` via tsx.

import { main } from './main';

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
