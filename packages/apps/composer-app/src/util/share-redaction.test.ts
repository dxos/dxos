//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { redactSharePayload } from './share-redaction.ts';

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

  test('passes a dropped event through', ({ expect }) => {
    expect(redactSharePayload(null)).toBeNull();
  });
});
