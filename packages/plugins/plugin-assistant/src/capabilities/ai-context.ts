//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiContext } from '@dxos/assistant';
import { LayerSpec, ServiceNotAvailableError } from '@dxos/compute';
import { Database, EID, Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

//
// Capability Module
//
// Contributes a process-affinity `LayerSpec` that materialises
// {@link AiContext.Service} from the resolution context's `conversation` DXN.
//

const AiContextSpec = LayerSpec.make(
  {
    affinity: 'process',
    requires: [Database.Service, Feed.FeedService],
    provides: [AiContext.Service],
  },
  (context) =>
    Layer.scoped(
      AiContext.Service,
      Effect.gen(function* () {
        if (!context.conversation) {
          return yield* Effect.die(
            new ServiceNotAvailableError(AiContext.Service.key, {
              message: `Service not available: ${AiContext.Service.key} — process spawn is missing 'conversation' in environment (set via Operation.withInvocationOptions or ProcessManager.spawn environment)`,
            }),
          );
        }
        const feed = yield* Database.resolve(EID.parse(context.conversation), Feed.Feed).pipe(Effect.orDie);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        return { binder };
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(Capabilities.LayerSpec, AiContextSpec)]),
);
