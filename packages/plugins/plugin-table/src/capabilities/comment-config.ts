//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';

const activate = Effect.fnUntraced(function* () {
  return [
    Capability.contribute(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Table.Table),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
