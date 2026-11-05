//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { liftShareFragment, redactSharePayload } from './share-link.ts';

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

describe('liftShareFragment', () => {
  test('moves the payload from the fragment into the query, keeping the rest of both', ({ expect }) => {
    expect(liftShareFragment('https://composer.space/space/doc+01J?x=1#share=abc&y=2')).toBe(
      '/space/doc+01J?x=1&share=abc#y=2',
    );
    expect(liftShareFragment('https://composer.space/space/doc+01J#share=abc')).toBe('/space/doc+01J?share=abc');
  });

  test('is undefined for a URL whose fragment carries no payload', ({ expect }) => {
    expect(liftShareFragment('https://composer.space/space/doc+01J?share=abc')).toBeUndefined();
    expect(liftShareFragment('https://composer.space/space/doc+01J#section')).toBeUndefined();
  });
});
