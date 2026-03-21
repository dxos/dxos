//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { CreateAgent } from './definitions';

import { ClientCapabilities } from '../types';

export default CreateAgent.pipe(
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
