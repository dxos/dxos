//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN } from '@dxos/echo';
import { PageAction } from '@dxos/plugin-crx/types';

export const AddFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.bookmarks.operation.addFromSnapshot'),
    name: 'Add bookmark',
    description: 'Save a web page snapshot as a bookmark.',
    icon: 'ph--bookmark-simple--regular',
  },
  input: Schema.Struct({
    snapshot: PageAction.Snapshot,
    target: Database.Database.annotations({ description: 'The database to add the bookmark to.' }),
  }),
  output: Schema.Struct({
    id: Schema.String,
  }),
});
