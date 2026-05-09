//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation } from '@dxos/compute';
import { Table } from '@dxos/react-ui-table/types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(AppCapabilities.CommentConfig, {
      id: Table.Table.typename,
      comments: 'unanchored',
    });
  }),
);
