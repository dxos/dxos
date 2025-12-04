//
// Copyright 2025 DXOS.org
//

import { join } from 'node:path';

import { describe, it } from 'vitest';

import { bundleFunction } from '@dxos/functions-runtime/native';

import { writeBundle } from './testing/util';

describe('bundle', () => {
  it('should bundle', async () => {
    const result = await bundleFunction({
      entryPoint: new URL('./functions/reply.ts', import.meta.url).pathname,
    });
    writeBundle('./dist/test/bundle-reply', result);
    console.log(join('dist/test/bundle-reply', result.entryPoint));
  });
});
