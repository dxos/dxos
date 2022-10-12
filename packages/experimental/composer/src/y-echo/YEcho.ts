//
// Copyright 2022 DXOS.org
//

// import {
//   ProviderAwareness, ProviderFactory, UserState
// } from '@lexical/react/LexicalCollaborationPlugin';
import { Observable } from 'lib0/observable';
import { useCallback } from 'react';
import { Doc, RelativePosition } from 'yjs';

import type { Item } from '@dxos/client';
import type { TextModel } from '@dxos/text-model';

export type UserState = {
  anchorPos: null | RelativePosition
  focusPos: null | RelativePosition
  name: string
  color: string
  focusing: boolean
};

export type ProviderAwareness = {
  getLocalState: () => UserState | null
  setLocalState: (state: UserState) => void
  getStates: () => Map<number, UserState>
  on: (type: 'update', cb: () => void) => void
  off: (type: 'update', cb: () => void) => void
};

export interface Provider {
  connect(): void | Promise<void>
  disconnect(): void
  awareness: ProviderAwareness
  on(type: 'sync', cb: (isSynced: boolean) => void): void
  on(type: 'status', cb: ({ status }: { status: string }) => void): void
  on(type: 'update', cb: (value: any) => void): void
  on(type: 'reload', cb: (doc: Doc) => void): void
  off(type: 'sync', cb: (isSynced: boolean) => void): void
  off(type: 'update', cb: (value: any) => void): void
  off(type: 'status', cb: ({ status }: { status: string }) => void): void
  off(type: 'reload', cb: (doc: Doc) => void): void
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
  private _states = new Map<number, UserState>();

  getStates () {
    return this._states;
  }

  getLocalState () {
    return this._state!;
  }

  setLocalState (state: UserState) {
    this._state = state;
    // console.log('TestAwareness.setLocalState', this._state);
  }

  on (type: string, cb: () => void) {
    // console.log('TestAwareness.on', type);
  }

  off (type: string, cb: () => void) {
    // console.log('TestAwareness.on', type);
  }
}

export class YEchoProvider extends Observable<string> {
  constructor (id: string, item: Item<TextModel>, {
    awareness = new TestAwareness()
  } = {}) {
    super();
    this.id = id;
    this.item = item;
    this.awareness = awareness;
  }

  public id: string;
  public item: Item<TextModel>;
  public awareness: TestAwareness;

  get doc (): Doc {
    return this.item.model.doc;
  }

  connect () {
    console.log('YEchoProvider.connect', this.id);
  }

  disconnect () {
    console.log('YEchoProvider.disconnect', this.id);
  }
}

export const useYEchoProvider = (item: Item<TextModel>): ProviderFactory => {
  return useCallback((id: string, yjsDocMap: Map<string, Doc>) => {
    const doc = item.model.doc;
    yjsDocMap.set(id, doc);
    return new YEchoProvider(id, item);
  }, [item]);
};
