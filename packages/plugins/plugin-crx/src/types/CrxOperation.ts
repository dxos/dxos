//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN } from '@dxos/echo';

import * as PageAction from './PageAction';

const input = Schema.Struct({
  snapshot: PageAction.Snapshot,
  target: Database.Database.annotations({ description: 'The database to add the object to.' }),
});

const output = Schema.Struct({
  id: Schema.String,
});

export const AddPersonFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.crx.operation.addPersonFromSnapshot'),
    name: 'Add person',
    description: 'Create a person from a page snapshot.',
    icon: 'ph--user--regular',
  },
  input,
  output,
});

export const AddOrganizationFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.crx.operation.addOrganizationFromSnapshot'),
    name: 'Add organization',
    description: 'Create an organization from a page snapshot.',
    icon: 'ph--building-office--regular',
  },
  input,
  output,
});

export const AddNoteFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.crx.operation.addNoteFromSnapshot'),
    name: 'Add note',
    description: 'Create a markdown note from a page snapshot.',
    icon: 'ph--note--regular',
  },
  input,
  output,
});
