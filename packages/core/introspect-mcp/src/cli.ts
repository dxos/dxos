//
// Copyright 2026 DXOS.org
//

// Direct CLI entry — invoked by `pnpm -F @dxos/introspect-mcp start` via tsx.

import { main } from './main';

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
