//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

export const SyncIssues = Operation.make({
  meta: {
    key: 'org.dxos.function.linear.sync-issues',
    name: 'Linear',
    description: 'Sync issues from Linear.',
  },
  input: Schema.Struct({
    team: Schema.String.annotations({
      description: 'Linear team id.',
    }),
  }),
  output: Schema.Any,
  services: [CredentialsService, Database.Service],
});
