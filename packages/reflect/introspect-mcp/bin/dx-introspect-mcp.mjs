#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { main } from '../dist/lib/node/main.mjs';

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
