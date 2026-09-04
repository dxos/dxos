//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import { isPromptAction, isToolbarAction } from './toolbar';

const action = (disposition?: string | string[]): AppGraphNode.ActionLike => ({
  id: 'action',
  type: AppGraphNode.ActionType,
  properties: disposition === undefined ? {} : { disposition },
  data: () => Effect.void,
});

describe('surface dispositions', () => {
  test('an action reaches only the surfaces it names', ({ expect }) => {
    expect(isToolbarAction(action('toolbar'))).to.be.true;
    expect(isPromptAction(action('toolbar'))).to.be.false;

    expect(isPromptAction(action('prompt'))).to.be.true;
    expect(isToolbarAction(action('prompt'))).to.be.false;
  });

  // What lets dictation sit in a document toolbar and a chat prompt while commenting stays in the
  // toolbar alone — the two surfaces act on different things, so opting into one must not opt into
  // the other.
  test('an action reaches both when it names both', ({ expect }) => {
    const both = action(['toolbar', 'prompt']);
    expect(isToolbarAction(both)).to.be.true;
    expect(isPromptAction(both)).to.be.true;
  });

  test('an action that names no surface reaches none', ({ expect }) => {
    expect(isToolbarAction(action())).to.be.false;
    expect(isPromptAction(action())).to.be.false;
  });
});

// Guards the pairing the fix relies on: the microphone is filed for both surfaces and the comment
// action for the toolbar only, so a chat companion's prompt draws the first and not the second.
describe('contributed actions, as the producers file them', () => {
  test('dictation is offered to a prompt; commenting is not', ({ expect }) => {
    const microphone = action(['toolbar', 'prompt']);
    const comment = action('toolbar');
    expect([microphone, comment].filter(isPromptAction)).to.have.length(1);
    expect([microphone, comment].filter(isToolbarAction)).to.have.length(2);
  });
});
