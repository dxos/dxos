//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Binding from '@dxos/plugin-connector/Binding';

import { JmapOperation } from '#types';

import { syncBinding } from './sync-binding.ts';

const handler = JmapOperation.JmapSync.pipe(
  Operation.withHandler(({ connection, priority }) =>
    Binding.syncAll({ connection, priority, sync: syncBinding }).pipe(
      Effect.map(({ outputs }) => ({
        newMessages: outputs.reduce((total, output) => total + output.newMessages, 0),
      })),
    ),
  ),
  Operation.opaqueHandler,
);

export default handler;
