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
  private readonly _states: UserState[] = [];
  private _state?: UserState;

  constructor(
    private readonly id: string
  ) {}

  getStates () {
    return this._states;
  }

  getLocalState () {
    return this._state!;
  }

  setLocalState (state: UserState) {
    // log('TestAwareness.setLocalState', this.id, state);
    this._state = state;
  }

  on (type: 'update', cb: () => void) {
    // log('TestAwareness.on', this.id, type);
    const existing = this._callbacks.get(type);
    assert(existing === undefined || existing === cb);
    this._callbacks.set(type, cb);
  }

  off (type: 'update', cb: () => void) {
    // log('TestAwareness.off', this.id, type);
    this._callbacks.delete(type);
  }
}

// TODO(burdon): Add to "who is using YJS?": https://github.com/yjs/yjs/blob/40196ae0a3f0ae7b1e7912befbacb3a904068e7e/README.md#who-is-using-yjs
//  - E.g., https://github.com/yousefED/matrix-crdt (Yousef)

/**
 * Provider is an Observable defined by YJS (e.g., @yjs/y-websocket).
 */
class TestProvider implements Provider {
  private readonly _callbacks = new Map<string, (doc: Doc) => void>();

  private _connected = false;
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

  async connect () {
    log('TestProvider.connect', this.id);
    // console.assert(!this._connected); // TODO(burdon): Called multiple times.
    this._callbacks.get('reload')!(this.doc);
    this._connected = true;
  }

  disconnect () {
    log('TestProvider.disconnect', this.id);
    assert(this._connected);
    this._connected = false;
  }

  // TODO(burdon): Other event types (status, sync).

  on (type: 'reload', cb: (doc: Doc) => void) {
    // log('TestProvider.on', this.id, type);
    assert(this._callbacks.get(type) === undefined);
    this._callbacks.set(type, cb);
  }

  off (type: 'reload', cb: (doc: Doc) => void) {
    // log('TestProvider.off', this.id, type);
    this._callbacks.delete(type);
  }
}

/**
 * Retunrs a provider factory for the given item.
 * @param item Document item.
 */
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
