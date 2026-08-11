//
// Copyright 2024 DXOS.org
//

import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { ChessModel } from '@dxos/react-ui-gameboard';

import type * as Chess from '../../types/Chess';

export class ExtendedChessModel extends ChessModel {
  constructor(
    registry: Registry.AtomRegistry,
    readonly object: Chess.State,
  ) {
    super(registry);
  }
}
