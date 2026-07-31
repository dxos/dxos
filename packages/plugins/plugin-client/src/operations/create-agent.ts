//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';

import { ClientCapabilities } from '../types';
import { CreateAgent } from './definitions';

const handler: Operation.WithHandler<typeof CreateAgent> = CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
      yield* Effect.promise(() =>
        client.services.services.EdgeAgentService!.createAgent(undefined, { timeout: 10_000 }),
      );
    }),
  ),
);

export default handler;
