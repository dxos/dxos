//
// Copyright 2024 DXOS.org
//

// import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { EditorState, type Extension } from '@codemirror/state';
import { expect } from 'chai';
import get from 'lodash.get';

import { Repo } from '@dxos/automerge/automerge-repo';
import { describe, test } from '@dxos/test';

import { automerge } from './automerge';

const createExtension = (content: string): readonly [EditorState, Extension] => {
  const repo = new Repo({
    network: [],
    // network: [new BroadcastChannelNetworkAdapter()],
  });

  const path = ['text'];
  const object = repo.create();
  const extension = automerge({ handle: object, path });
  const str = get(object.docSync()!, path);

  const state = EditorState.create({ doc: str, extensions: [extension] });
  return [state, extension] as const;
};

describe('Automerge', () => {
  test('create', () => {
    const content = 'hello world!';
    const [state] = createExtension(content);
    expect(state.doc.toString()).to.eq(content);
  });

  // TODO(burdon): Sim browser (vitest).
  test('CM mutations', () => {
    const content = 'hello world!';
    // const [text, state] = createExtension(content);
    // const view = new EditorView({ state });
    // view.dispatch({});

    // const t = state.update({
    //   changes: {
    //     from: 0,
    //     insert: 'xx',
    //   },
    // });

    // console.log(t);
    // console.log(state.doc.toString());

    // expect(state.doc.toString()).to.eq(content);
  });
});
