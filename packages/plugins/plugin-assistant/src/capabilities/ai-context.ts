//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiContext } from '@dxos/assistant';
import { LayerSpec, ServiceNotAvailableError } from '@dxos/compute';
import { Database, EchoURI, Feed } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';

//
// Capability Module
//
// Contributes a process-affinity `LayerSpec` that materialises
// {@link AiContext.Service} from the resolution context's `conversation` DXN.
//
// Previously, `AiContext.Service` was provided only inline by the assistant
// plugin processor and by `AiSession.createRequest`. That works while the
// formatting code runs inside the calling fiber, but breaks the moment any
// nested call crosses a process boundary via `Operation.invoke` — the spawned
// process gets its own `ServiceResolver`/`LayerStack` and there is no
// production provider for `AiContext.Service` to back it.
//
// The dispatcher path (trigger → AgentWorker → AiSession.createRequest →
// formatSystemPrompt → Template.processTemplate → Operation.invoke(GetContext))
// hits exactly this gap: `GetContext` declares `services: [AiContext.Service,
// Database.Service]`, the child spawn inherits `space` + `conversation` from
// the parent's environment (see TriggerDispatcher + Operation.invoke), but
// then `LayerStack` has nothing to satisfy `AiContext.Service` with.
//
// This spec mirrors the test-layer factory in
// `@dxos/functions-runtime/testing` so the production resolver behaves the
// same way: load the conversation feed via `Database.Service`, hand it to an
// `AiContext.Binder`, and scope the binder to the process slice's lifetime.
//

/**
 * Process-affinity LayerSpec for {@link AiContext.Service}.
 *
 * The factory runs once per process slice (keyed on space + conversation +
 * process id). If `context.conversation` is absent the slice fails with a
 * `ServiceNotAvailable` defect — there is no useful binder to build without
 * a conversation feed, and a precise error at slice init beats a silent
 * binder that throws on first use.
 */
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
        // The spec is registered unconditionally so the LayerStack knows how
        // to satisfy `AiContext.Service` in principle. Surface a precise
        // failure when the conversation context is missing — this happens
        // when an operation that requires `AiContext.Service` is invoked
        // without going through `Operation.withInvocationOptions({
        // conversation })` (or equivalent spawn `environment`). Raised as a
        // defect because the spec's factory must produce
        // `Layer<..., never, ...>`; the trigger dispatcher's `causeToError`
        // path still surfaces the original message in logs.
        if (!context.conversation) {
          return yield* Effect.die(
            new ServiceNotAvailableError(AiContext.Service.key, {
              message: `Service not available: ${AiContext.Service.key} — process spawn is missing 'conversation' in environment (set via Operation.withInvocationOptions or ProcessManager.spawn environment)`,
            }),
          );
        }
        const feed = yield* Database.resolve(EchoURI.parse(context.conversation), Feed.Feed).pipe(Effect.orDie);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const binder = yield* acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        return { binder };
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(Capabilities.LayerSpec, AiContextSpec)]),
);
