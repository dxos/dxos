//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Context } from '@dxos/context';

import { CallsCapabilities } from '#types';

/**
 * Bridges {@link CallManager} lifecycle/state/transcript events to every contributed
 * {@link CallsCapabilities.EventHandler} (e.g. plugin-meeting's transcription wiring). Handlers are
 * resolved lazily per event so contributors that activate after this module are still invoked.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const manager = yield* Capability.waitFor(CallsCapabilities.Manager);

    const ctx = Context.default();
    const handlers = () => capabilities.getAll(CallsCapabilities.EventHandler);

    manager.roomJoined.on(ctx, ({ roomId }) => {
      for (const handler of handlers()) {
        void handler.onJoin?.({ roomId });
      }
    });
    manager.left.on(ctx, (roomId) => {
      for (const handler of handlers()) {
        void handler.onLeave?.(roomId);
      }
    });
    manager.callStateUpdated.on(ctx, (state) => {
      for (const handler of handlers()) {
        void handler.onCallStateUpdated?.(state);
      }
    });
    manager.mediaStateUpdated.on(ctx, (state) => {
      for (const handler of handlers()) {
        void handler.onMediaStateUpdated?.(state);
      }
    });
    manager.transcript.on(ctx, (event) => {
      for (const handler of handlers()) {
        void handler.onTranscript?.(event);
      }
    });

    return Capability.contributes(Capabilities.Null, null, () => Effect.promise(() => ctx.dispose()));
  }),
);
