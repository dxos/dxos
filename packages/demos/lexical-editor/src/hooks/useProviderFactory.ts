//
// Copyright 2022 DXOS.org
//

import {
  ProviderAwareness, ProviderFactory, UserState
} from '@lexical/react/LexicalCollaborationPlugin';
import { Provider } from '@lexical/yjs';
import assert from 'assert';
import debug from 'debug';
import { useMemo } from 'react';
import { Doc } from 'yjs';

import { Item } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

const log = debug('dxos:lexical:useProviderFactory');

/**
 * User presence.
 */
class TestProviderAwareness implements ProviderAwareness {
  private readonly _callbacks = new Map<string, () => void>();
  private _state?: UserState;

  constructor(
    private readonly id: string
  ) {}

  getStates () {
    return [];
  }

  getLocalState () {
    return this._state!;
  }

  setLocalState (state: UserState) {
    // log('TestAwareness.setLocalState', this.id, state);
    this._state = state;
  }

  on (type: string, cb: () => void) {
    // log('TestAwareness.on', this.id, type);
    const existing = this._callbacks.get(type);
    assert(existing === undefined || existing === cb);
    this._callbacks.set(type, cb);
  }

  off (type: string, cb: () => void) {
    // log('TestAwareness.off', this.id, type);
    this._callbacks.delete(type);
  }
}

class TestProvider implements Provider {
  private readonly _callbacks = new Map<string, (doc: Doc) => void>();

  readonly awareness: ProviderAwareness;

  constructor (
    readonly id: string,
    readonly item: Item<TextModel>
  ) {
    this.awareness = new TestProviderAwareness(id);
  }

  get doc (): Doc {
    return this.item.model.doc;
  }

  connect () {
    log('TestProvider.connect', this.id);
    this._callbacks.get('reload')!(this.doc);
  }

  disconnect () {
    log('TestProvider.disconnect', this.id);
  }

  on (type: string, cb: (doc: Doc) => void) {
    // log('TestProvider.on', this.id, type);
    assert(this._callbacks.get(type) === undefined);
    this._callbacks.set(type, cb);
  }

  off (type: string, cb: (doc: Doc) => void) {
    // log('TestProvider.off', this.id, type);
    this._callbacks.delete(type);
  }
}

export const useProviderFactory = (item: Item<TextModel>): ProviderFactory => {
  return useMemo<ProviderFactory>(() => {
    return (id: string, docMap: Map<string, Doc>): Provider => {
      const provider = new TestProvider(id, item);
      // Defer setting document until connected.
      docMap.set(id, new Doc());
      log('constructed', id, docMap);
      return provider;
    };
  }, [item]);
};
