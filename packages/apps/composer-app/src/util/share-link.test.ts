//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { readStashedShare, redactSharePayload, stashShareFragment } from './share-link.ts';

describe('redactSharePayload', () => {
  test('empties the share payload in every URL an event holds, and leaves the rest', ({ expect }) => {
    const event = {
      event: '$pageview',
      properties: {
        $current_url: 'https://composer.space/space/doc+01J?share=eJyrVkrLzClRslIqSk1RslJKS8wpTq0FAE4FBuo&x=1#top',
        $pathname: '/space/doc+01J',
        $snapshot_data: [{ type: 4, data: { href: 'https://composer.space/?share=abc' } }],
      },
      $set_once: { $initial_current_url: 'https://composer.space/?x=1&share=abc' },
    };

    expect(redactSharePayload(event)).toEqual({
      event: '$pageview',
      properties: {
        $current_url: 'https://composer.space/space/doc+01J?share=&x=1#top',
        $pathname: '/space/doc+01J',
        $snapshot_data: [{ type: 4, data: { href: 'https://composer.space/?share=' } }],
      },
      $set_once: { $initial_current_url: 'https://composer.space/?x=1&share=' },
    });
  });

  test('empties a share payload whose name is percent-encoded', ({ expect }) => {
    expect(redactSharePayload({ url: 'https://composer.space/?s%68are=abc&x=1' })).toEqual({
      url: 'https://composer.space/?s%68are=&x=1',
    });
  });

  test('passes a dropped event through', ({ expect }) => {
    expect(redactSharePayload(null)).toBeNull();
  });

  test('empties a share payload in the fragment', ({ expect }) => {
    expect(redactSharePayload({ url: 'https://composer.space/doc#share=abc' })).toEqual({
      url: 'https://composer.space/doc#share=',
    });
  });
});

describe('stashShareFragment', () => {
  test('moves the payload from the fragment into storage, keeping the rest of the URL', ({ expect }) => {
    const storage = new Map<string, string>();
    const setItem = (key: string, value: string) => void storage.set(key, value);
    expect(stashShareFragment('https://composer.space/space/doc+01J?x=1#share=abc&y=2', () => ({ setItem }))).toBe(
      '/space/doc+01J?x=1#y=2',
    );
    expect(readStashedShare(() => ({ getItem: (key) => storage.get(key) ?? null }))).toBe('abc');
  });

  test('drops the payload from the URL when storage is blocked', ({ expect }) => {
    const blocked = () => {
      throw new Error('SecurityError');
    };
    expect(stashShareFragment('https://composer.space/space/doc+01J#share=abc', blocked)).toBe('/space/doc+01J');
    expect(readStashedShare(blocked)).toBeNull();
  });

  test('is undefined for a URL whose fragment carries no payload', ({ expect }) => {
    const storage = () => ({ setItem: () => {} });
    expect(stashShareFragment('https://composer.space/space/doc+01J?share=abc', storage)).toBeUndefined();
    expect(stashShareFragment('https://composer.space/space/doc+01J#section', storage)).toBeUndefined();
  });
});
