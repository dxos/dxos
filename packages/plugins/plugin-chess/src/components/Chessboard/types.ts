//
// Copyright 2024 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';

import { ChessModel } from '@dxos/react-ui-gameboard';

import { type Chess } from '../../types';

export class ExtendedChessModel extends ChessModel {
  constructor(
    registry: Registry.Registry,
    readonly object: Chess.Game,
  ) {
    super(registry);
  }
}
