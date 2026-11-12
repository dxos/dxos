//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import { StashedLink } from './StashedLink.ts';

// #region operation
export const MarkRead = Operation.make({
  meta: {
    // eslint-disable-next-line @dxos/rules/operation-key-shape -- a sample key.
    key: DXN.make('com.example.operation.stashedLink.markRead'),
    name: 'Mark as read',
    description: 'Mark a link as read.',
    icon: 'ph--check-circle--regular',
  },
  // The handler resolves the reference in the link's space.
  services: [Database.Service],
  input: Schema.Struct({
    link: Ref.Ref(StashedLink).annotate({
      description: 'The link that was read.',
    }),
  }),
  output: Schema.Void,
});
// #endregion
