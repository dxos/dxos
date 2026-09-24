//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Message } from '@dxos/types';

import { FeedModel, fromMessages } from './feed.ts';

const message = (role: 'user' | 'assistant', text: string) =>
  Message.make({ sender: { role, name: role }, blocks: [{ _tag: 'text', text }] });

describe('FeedModel', () => {
  test('stops follow the policy, and the policy is swappable', () => {
    const model = fromMessages([
      message('user', 'question one'),
      message('assistant', 'answer one'),
      message('user', 'question two'),
    ]);

    expect(model.stops().map(({ index }) => index)).to.deep.eq([0, 1, 2]);

    model.setStops('prompt');
    expect(model.stops().map(({ index }) => index)).to.deep.eq([0, 2]);
  });

  test('a tool result is not a prompt, though it travels back with the user role', () => {
    const model = fromMessages(
      [
        message('user', 'question'),
        message('assistant', 'calling a tool'),
        Message.make({
          sender: { role: 'user' },
          blocks: [{ _tag: 'text', text: '<result pid=1>…</result>', disposition: 'synthetic' }],
        }),
        message('assistant', 'answer'),
      ],
      { stops: 'prompt' },
    );

    expect(model.stops().map(({ index }) => index)).to.deep.eq([0]);
  });

  test('the model owns iteration: an edge asks the source, and the page arrives as a prepend', async () => {
    const history = [message('user', 'older')];
    const model = new FeedModel({
      messages: [message('user', 'newer')],
      loadBefore: async () => history.splice(0),
    });

    const changes: unknown[] = [];
    model.subscribe((change) => changes.push(change));

    expect(await model.more('start')).to.eq(true);
    expect(changes).to.deep.eq([{ prepended: 1 }]);
    // The source is drained; the edge stops asking.
    expect(await model.more('start')).to.eq(false);
  });

  test('streaming is an update to one identity, not a change to the list', () => {
    const answer = message('assistant', 'streaming');
    const model = fromMessages([message('user', 'prompt'), answer]);
    const changes: unknown[] = [];
    model.subscribe((change) => changes.push(change));

    model.setStreaming(answer.id);
    model.stream(answer.id);
    model.setStreaming(undefined);

    expect(model.count).to.eq(2);
    expect(changes).to.deep.eq([{ updated: [answer.id] }, { updated: [answer.id] }, { updated: [answer.id] }]);
  });

  test('search runs over the model, since the DOM cannot see unmounted rows', () => {
    const model = fromMessages([message('user', 'find the needle'), message('assistant', 'nothing here')]);

    const hits = model.search('needle');
    expect(hits.length).to.eq(1);
    expect(hits[0].index).to.eq(0);
  });
});
