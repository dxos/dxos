//
// Copyright 2024 DXOS.org
//

import { type Registry } from '@effect-atom/atom';

import { ChessModel } from '@dxos/react-ui-gameboard';

import type * as Chess from '../../types/Chess';

export class ExtendedChessModel extends ChessModel {
  constructor(
    registry: Registry.Registry,
    readonly object: Chess.State,
  ) {
    super(registry);
  }
}
