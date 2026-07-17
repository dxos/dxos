//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';

const activate = Effect.fnUntraced(function* () {
  return [
    Capability.provide(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Table.Table),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
