//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';

import { MeetingRecorderCapabilities, MeetingRecorderOperation } from '#types';

/**
 * Forwards the host's microphone-usage events to {@link MeetingRecorderOperation.HandleDetection},
 * which applies the settings and the ignore list. A no-op where the host cannot observe other apps.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const bridge = yield* MeetingRecorderCapabilities.Bridge;

    const started = yield* Effect.promise(async () => {
      const support = await bridge.getSupport();
      if (!support.detection) {
        return false;
      }

      await bridge.startDetection((event) => {
        void invokePromise(MeetingRecorderOperation.HandleDetection, event).catch((err) => log.catch(err));
      });
      return true;
    });

    if (started) {
      yield* Effect.addFinalizer(() => Effect.promise(() => bridge.stopDetection()));
    }

    return [];
  }),
);
