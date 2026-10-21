//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Binding from '@dxos/plugin-connector/Binding';

import { GoogleOperation } from '#types';

import { syncBinding } from './sync-binding.ts';

const handler = GoogleOperation.GoogleMailSync.pipe(
  Operation.withHandler(({ connection, priority, userId = 'me', label = 'all' }) =>
    Binding.syncAll({
      connection,
      priority,
      sync: (binding) => syncBinding(binding, { userId, label }),
    }).pipe(
      Effect.map(({ outputs }) => ({
        newMessages: outputs.reduce((total, output) => total + output.newMessages, 0),
      })),
    ),
  ),
  Operation.opaqueHandler,
);

export default handler;
