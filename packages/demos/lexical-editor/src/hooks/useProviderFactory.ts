//
// Copyright 2022 DXOS.org
//

import {
  ProviderAwareness, ProviderFactory, UserState
} from '@lexical/react/LexicalCollaborationPlugin';
import { Provider } from '@lexical/yjs';
import debug from 'debug';
import { useMemo } from 'react';
import { Doc } from 'yjs';

import { Item } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

const log = debug('dxos:lexical:useProviderFactory');

/**
 * User presence.
 */
class TestAwareness implements ProviderAwareness {
  private _state?: UserState;

  getStates () {
    return [];
  }

  getLocalState () {
    return this._state!;
  }

  setLocalState (state: UserState) {
    this._state = state;
    log('TestAwareness.setLocalState', this._state);
  }

  on (type: string, cb: () => void) {
    log('TestAwareness.on', type);
  }

  off (type: string, cb: () => void) {
    log('TestAwareness.on', type);
  }
}

class TestProvider implements Provider {
  readonly awareness = new TestAwareness();

  constructor (
    private readonly id: string
  ) {}

  connect () {
    log('TestProvider.connect', this.id);
  }

  disconnect () {
    log('TestProvider.disconnect', this.id);
  }

  on (type: string, cb: (doc: Doc) => void) {
    log('TestProvider.on', type);
  }

  off (type: string, cb: (doc: Doc) => void) {
    log('TestProvider.off', type);
  }
}

export const useProviderFactory = (
  item: Item<TextModel>
): ProviderFactory => useMemo<ProviderFactory>(() => (id: string, yjsDocMap: Map<string, Doc>): Provider => {
  log('constructed', id, yjsDocMap);

  // TODO(burdon): Get from text model (create ID externally).
  // const doc = new Doc();
  const doc = item.model.doc;
  yjsDocMap.set(id, doc);

  // TODO(burdon): Initially has newlines.
  // TODO(burdon): Typing at end of document has issues.
  console.log('[', doc.getText().toString(), ']');

  return new TestProvider(id);
}, [item]);
