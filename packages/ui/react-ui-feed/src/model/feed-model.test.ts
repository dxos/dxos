//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Message } from '@dxos/types';

import { defaultRenderer, messageText, searchFeed, sliceFeed } from './feed-model.ts';

const makeMessage = (text: string, mimeType?: string) =>
  Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text, ...(mimeType ? { mimeType } : {}) }] });

describe('feed model', () => {
  test('renders markdown by default and html when the block declares it', () => {
    expect(defaultRenderer(makeMessage('# Hello'))).toEqual({ kind: 'markdown', text: '# Hello' });
    expect(defaultRenderer(makeMessage('<p>Hello</p>', 'text/html'))).toEqual({ kind: 'html', html: '<p>Hello</p>' });
  });

  test('html messages are searchable as text', () => {
    expect(messageText(makeMessage('<p>Hello <b>world</b></p>', 'text/html'), defaultRenderer)).toEqual('Hello world');
  });

  describe('search', () => {
    test('finds every occurrence across messages, with the index for scroll-to', () => {
      const messages = [makeMessage('alpha beta'), makeMessage('gamma'), makeMessage('beta beta')];
      const hits = searchFeed(messages, defaultRenderer, 'beta');
      expect(hits.map(({ index, offset }) => [index, offset])).toEqual([
        [0, 6],
        [2, 0],
        [2, 5],
      ]);
    });

    test('is case-insensitive and empty for an empty query', () => {
      const messages = [makeMessage('Alpha')];
      expect(searchFeed(messages, defaultRenderer, 'alpha')).toHaveLength(1);
      expect(searchFeed(messages, defaultRenderer, '')).toEqual([]);
    });

    test('reaches messages that no viewport has mounted', () => {
      // The engine only mounts the visible window; search runs over the model, so a hit 500 messages
      // down is found without ever rendering it.
      const messages = [...Array(500)].map((_, index) => makeMessage(`message ${index}`));
      expect(searchFeed(messages, defaultRenderer, 'message 499')).toMatchObject([{ index: 499, offset: 0 }]);
    });
  });

  describe('slice', () => {
    const messages = [makeMessage('alpha'), makeMessage('beta'), makeMessage('gamma')];

    test('spans message boundaries', () => {
      const text = sliceFeed(messages, defaultRenderer, {
        from: { messageId: messages[0].id, offset: 2 },
        to: { messageId: messages[2].id, offset: 3 },
      });
      expect(text).toEqual('pha\n\nbeta\n\ngam');
    });

    test('is symmetric for a backwards drag', () => {
      const range = {
        from: { messageId: messages[2].id, offset: 3 },
        to: { messageId: messages[0].id, offset: 2 },
      };
      expect(sliceFeed(messages, defaultRenderer, range)).toEqual('pha\n\nbeta\n\ngam');
    });

    test('handles a range within one message', () => {
      const text = sliceFeed(messages, defaultRenderer, {
        from: { messageId: messages[1].id, offset: 1 },
        to: { messageId: messages[1].id, offset: 3 },
      });
      expect(text).toEqual('et');
    });

    test('returns nothing for a stale anchor', () => {
      const text = sliceFeed(messages, defaultRenderer, {
        from: { messageId: 'gone', offset: 0 },
        to: { messageId: messages[1].id, offset: 1 },
      });
      expect(text).toEqual('');
    });
  });
});
