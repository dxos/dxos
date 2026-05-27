//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Credential, Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const SyncIssues = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.linear.sync-issues'),
    name: 'Linear',
    description: 'Sync issues from Linear.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    team: Schema.String.annotations({
      description: 'Linear team id.',
    }),
  }),
  output: Schema.Any,
  services: [Credential.CredentialsService, Database.Service],
});
