//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as LinkAction from './LinkAction.ts';

const present: LinkAction.LinkAction = {
  id: DXN.make('com.example.linkAction.present'),
  links: ['public'],
  appliesTo: (data) => data === 'deck',
  run: () => Effect.void,
};

const actions = [present];
const url = new URL('https://view.example.com/pub-1/deck');

describe('LinkAction', () => {
  test('a link carries the action its kind takes for the object, and only that', ({ expect }) => {
    const shared = LinkAction.withAction(url, actions, 'public', 'deck');
    expect(shared.searchParams.get(LinkAction.PARAM)).toBe(present.id);
    expect(LinkAction.withAction(url, actions, 'internal', 'deck').search).toBe('');
    expect(LinkAction.withAction(url, actions, 'public', 'doc').search).toBe('');
  });

  test('a link runs only a contributed action that applies to the object it opens', ({ expect }) => {
    const shared = LinkAction.withAction(url, actions, 'public', 'deck');
    expect(LinkAction.find(shared, actions, 'deck')).toBe(present);
    expect(LinkAction.find(shared, actions, 'doc')).toBeUndefined();

    const unknown = new URL(url);
    unknown.searchParams.set(LinkAction.PARAM, DXN.make('com.example.linkAction.delete'));
    expect(LinkAction.find(unknown, actions, 'deck')).toBeUndefined();
    expect(LinkAction.withoutAction(shared).search).toBe('');
  });
});
