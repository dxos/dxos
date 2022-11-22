//
// Copyright 2022 DXOS.org
//

import { join } from 'path';

import { ClassProcessor } from './class-processor';

describe('Code analysis', function () {
  it('traverses echo-db', function () {
    const baseDir = join(process.cwd());
    console.log(baseDir);

    // prettier-ignore
    const processor = new ClassProcessor([
      join(baseDir, 'packages/core/echo/echo-db/src/**/*.ts')
    ]);

    processor.processFile(join(baseDir, 'packages/core/echo/echo-db/src/packlets/database/database.ts'));
  });

  it('traverses client', function () {
    const baseDir = join(process.cwd());
    console.log(baseDir);

    // prettier-ignore
    const processor = new ClassProcessor([
      join(baseDir, 'packages/sdk/client/src/**/*.ts'),
      join(baseDir, 'packages/sdk/client-services/src/**/*.ts')
    ]);

    processor.processFile(join(baseDir, 'packages/sdk/client/src/packlets/client/client.ts'));
  });

  it.only('traverses client-services', function () {
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
