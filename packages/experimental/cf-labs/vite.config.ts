//
// Copyright 2024 DXOS.org
//

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

/**
 * https://developers.cloudflare.com/workers/testing/vitest-integration/get-started/write-your-first-test
 */
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
      },
    },
  },
});
