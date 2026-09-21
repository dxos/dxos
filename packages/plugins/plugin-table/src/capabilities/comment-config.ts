//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';

import { TableEvents } from '#types';

export const CommentConfig = AppCapability.commentConfig(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(AppCapabilities.CommentConfig, {
        id: Type.getTypename(Table.Table),
        comments: 'unanchored',
      }),
    ];
  }),
  {
    activatesOn: TableEvents.Start,
    environments: ['node'],
  },
);
