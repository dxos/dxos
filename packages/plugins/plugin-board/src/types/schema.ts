//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { BoardLayout } from '@dxos/react-ui-board';

export const BoardType = Schema.Struct({
  layout: BoardLayout,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Board',
    version: '0.1.0',
  }),
);

export interface BoardType extends Schema.Schema.Type<typeof BoardType> {}
