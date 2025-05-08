//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { ChatProcessor } from './processor';

describe('ChatProcessor', () => {
  it('should be instantiable', ({ expect }) => {
    const client = {} as any; // TODO(burdon): Create mock.
    const processor = new ChatProcessor(client);
    expect(processor).toBeDefined();
  });
});
