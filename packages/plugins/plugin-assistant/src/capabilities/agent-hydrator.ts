//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AgentService from '@dxos/compute/AgentService';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { log } from '@dxos/log';

import { isReadOnly } from '../util/read-only.ts';

//
// Capability Module
//
// Rehydrates durable agent processes once `Capabilities.ProcessManagerRuntime` is contributed; a read-only host
// rehydrates none.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    const runtime = yield* Capabilities.ProcessManagerRuntime;

    runtime.runFork(
      Effect.gen(function* () {
        if (isReadOnly(manager)) {
          return;
        }

        const service = yield* AgentService.AgentService;
        yield* service.hydrate();
      }).pipe(
        Effect.provide(ServiceResolver.provide({}, AgentService.AgentService)),
        Effect.catchCause((cause) =>
          Effect.sync(() => log.warn('agent hydrate failed', { cause: Cause.pretty(cause) })),
        ),
      ),
    );

    return [];
  }),
);
