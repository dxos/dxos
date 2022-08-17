//
// Copyright 2022 DXOS.org
//

// import {
//   ProviderAwareness, ProviderFactory, UserState
// } from '@lexical/react/LexicalCollaborationPlugin';
import debug from 'debug';
import { useMemo } from 'react';
import { Doc, RelativePosition } from 'yjs';

import { Item } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

const log = debug('dxos:lexical:useProviderFactory');

//
// Temporarily copied from LexicalCollaborationPlugin.js.flow
// TODO(burdon): https://github.com/facebook/lexical/issues/2844
//
export type UserState = {
  anchorPos: null | RelativePosition,
  focusPos: null | RelativePosition,
  name: string,
  color: string,
  focusing: boolean,
};

export type ProviderAwareness = {
  getLocalState: () => UserState | null,
  setLocalState: (state: UserState) => void,
  getStates: () => Map<number, UserState>,
  on: (type: 'update', cb: () => void) => void,
  off: (type: 'update', cb: () => void) => void,
};

export interface Provider {
  connect(): void | Promise<void>;
  disconnect(): void;
  awareness: ProviderAwareness;
  on(type: 'sync', cb: (isSynced: boolean) => void): void;
  on(type: 'status', cb: ({ status }: { status: string }) => void): void;
  on(type: 'update', cb: (value: any) => void): void;
  on(type: 'reload', cb: (doc: Doc) => void): void;
  off(type: 'sync', cb: (isSynced: boolean) => void): void;
  off(type: 'update', cb: (value: any) => void): void;
  off(type: 'status', cb: ({ status }: { status: string }) => void): void;
  off(type: 'reload', cb: (doc: Doc) => void): void;
}

export type ProviderFactory = (
  id: string,
  yjsDocMap: Map<string, Doc>,
) => Provider;

/**
 * User presence.
 */
class TestAwareness implements ProviderAwareness {
  private _state?: UserState;
  private _states = new Map<number, UserState>()

  getStates () {
    return this._states;
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

  on (type: string, cb: any) {
    log('TestProvider.on', type);
  }

  off (type: string, cb: any) {
    log('TestProvider.off', type);
  }
}

export const useProviderFactory = (
  item?: Item<TextModel>
): ProviderFactory => {
  return useMemo<ProviderFactory>(() => (id: string, yjsDocMap: Map<string, Doc>): Provider => {
    log('constructed', id, yjsDocMap);

    // TODO(burdon): Get from text model (create ID externally).
    // const doc = new Doc();
    const doc = item!.model.doc;
    yjsDocMap.set(id, doc);

    // TODO(burdon): Initially has newlines.
    // TODO(burdon): Typing at end of document has issues.
    console.log('[', doc.getText().toString(), ']');

    return new TestProvider(id);
  }, [item]);
};
