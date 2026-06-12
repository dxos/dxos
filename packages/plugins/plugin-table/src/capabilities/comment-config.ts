//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const activate: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.CommentConfig>,
  never,
  Capability.Service
> = Effect.fnUntraced(function* () {
  return Capability.contributes(AppCapabilities.CommentConfig, {
    id: Type.getTypename(Table.Table),
    comments: 'unanchored',
  });
});

export default activate;
