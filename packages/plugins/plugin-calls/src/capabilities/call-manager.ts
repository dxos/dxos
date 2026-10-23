//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { CallsCapabilities } from '#types';

import { CallManager } from '../calls/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const haloIdentity = yield* ClientCapabilities.IdentityService;
    const capabilities = yield* Capability.Service;
    const callManager = new CallManager(client, registry, haloIdentity);
    yield* Effect.tryPromise(() => callManager.open());

    // Forwards the manager's lifecycle to the contributed event handlers (plugin-meeting's call wiring). Resolved per
    // event so a handler contributed after this module activates is still reached.
    const ctx = new Context();
    const dispatch = (invoke: (handler: CallsCapabilities.CallProperties) => Promise<void> | undefined) => {
      for (const handler of capabilities.getAll(CallsCapabilities.EventHandler)) {
        void invoke(handler)?.catch((error) => log.catch(error));
      }
    };
    callManager.roomJoined.on(ctx, ({ roomId }) => dispatch((handler) => handler.onJoin({ roomId })));
    callManager.left.on(ctx, (roomId) => dispatch((handler) => handler.onLeave(roomId)));
    callManager.callStateUpdated.on(ctx, (state) => dispatch((handler) => handler.onCallStateUpdated(state)));
    callManager.mediaStateUpdated.on(ctx, (state) => dispatch((handler) => handler.onMediaStateUpdated?.(state)));

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void ctx.dispose();
        void callManager.close();
      }),
    );
    return Capability.contribute(CallsCapabilities.Manager, callManager);
  }),
);
