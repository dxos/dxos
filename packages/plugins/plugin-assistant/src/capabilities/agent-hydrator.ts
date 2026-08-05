//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AgentService, ServiceResolver } from '@dxos/compute';
import { log } from '@dxos/log';

//
// Capability Module
//
// Rehydrates durable agent processes once `Capabilities.ProcessManagerRuntime` is contributed.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const runtime = yield* Capabilities.ProcessManagerRuntime;

    runtime.runFork(
      Effect.gen(function* () {
        const service = yield* AgentService.AgentService;
        yield* service.hydrate();
      }).pipe(
        Effect.provide(ServiceResolver.provide({}, AgentService.AgentService)),
        Effect.catchAllCause((cause) =>
          Effect.sync(() => log.warn('agent hydrate failed', { cause: Cause.pretty(cause) })),
        ),
      ),
    );

    return [];
  }),
);
