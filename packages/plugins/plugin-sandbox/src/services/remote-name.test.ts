//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { remoteName } from './remote-name.ts';

describe('remoteName', () => {
  test('slugs the display name', ({ expect }) => {
    expect(remoteName({ id: '01M3RH0NXYRAPE6VYYQTY3Q56H', name: 'My Site!' })).toBe('my-site');
  });

  test('never starts with a dash, which git would read as an option', ({ expect }) => {
    expect(remoteName({ id: '01M3RH0NXYRAPE6VYYQTY3Q56H', name: '--upload-pack=x' })).toBe('upload-pack-x');
  });

  test('falls back to the id when the name leaves nothing', ({ expect }) => {
    expect(remoteName({ id: '01M3RH0NXYRAPE6VYYQTY3Q56H', name: '🙂' })).toBe('repo-qty3q56h');
    expect(remoteName({ id: '01M3RH0NXYRAPE6VYYQTY3Q56H' })).toBe('repo-qty3q56h');
  });

  test('is unique among the names already taken', ({ expect }) => {
    expect(remoteName({ id: 'x', name: 'site' }, new Set(['site', 'site-2']))).toBe('site-3');
  });
});
