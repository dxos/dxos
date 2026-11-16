//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { scrubArchive } from './publication-client.ts';

describe('scrubArchive', () => {
  test('drops provenance and lists object ids', ({ expect }) => {
    const archive = { version: 1, originalSpaceId: 'S', exportedBy: 'K', objects: [{ id: 'a' }, { id: 'b' }, {}] };
    const { text, objects } = scrubArchive(new TextEncoder().encode(JSON.stringify(archive)));
    expect(JSON.parse(text)).toEqual({ version: 1, objects: [{ id: 'a' }, { id: 'b' }, {}] });
    expect(objects).toEqual(['a', 'b']);
  });
});
