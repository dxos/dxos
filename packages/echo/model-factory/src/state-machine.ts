//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/crypto';

export interface MutationProcessMeta {
  author: PublicKey
}

export interface StateMachine<TState, TMutation, TSnapshot> {
  getState(): TState
  reset(snapshot: TSnapshot): void
  process(mutation: TMutation, meta: MutationProcessMeta): void
  snapshot(): TSnapshot
}
