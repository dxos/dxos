//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';
import { describe, test } from 'vitest';

import { ClassProcessor } from './class-processor';

describe.skip('Code analysis', () => {
  test.skip('traverses echo-db', () => {
    const baseDir = join(process.cwd());
    console.log(baseDir);

    // prettier-ignore
    const processor = new ClassProcessor([
      join(baseDir, 'packages/core/echo/echo-db/src/**/*.ts')
    ]);

    processor.processFile(join(baseDir, 'packages/core/echo/echo-db/src/packlets/database/database.ts'));
  });

  test('traverses client', () => {
    const baseDir = join(process.cwd());
    console.log(baseDir);

    // prettier-ignore
    const processor = new ClassProcessor([
      join(baseDir, 'packages/sdk/client/src/**/*.ts'),
      join(baseDir, 'packages/sdk/client-services/src/**/*.ts')
    ]);

    processor.processFile(join(baseDir, 'packages/sdk/client/src/client/client.ts'));
  });

  test('traverses client-services', () => {
    const baseDir = join(process.cwd());
    console.log(baseDir);

    // prettier-ignore
    const processor = new ClassProcessor([
      join(baseDir, 'packages/sdk/client-services/src/**/*.ts'),
      join(baseDir, 'packages/core/echo/echo-db/src/**/*.ts')
    ]);

    processor.processFile(join(baseDir, 'packages/sdk/client-services/src/packlets/services/service-host.ts'));
  });
});
