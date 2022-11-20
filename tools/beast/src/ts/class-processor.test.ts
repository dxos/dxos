//
// Copyright 2022 DXOS.org
//

import { ClassProcessor } from './class-processor';

describe('Code analysis', function () {
  it.only('traverses class hierarchy', function () {
    const rootDir = 'packages/sdk/client-services';
    const processor = new ClassProcessor(rootDir, 'src/**/*.ts');
    processor.processFile('src/packlets/services/service-host.ts');
  });
});
