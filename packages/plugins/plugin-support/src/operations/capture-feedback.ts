//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';

import * as SupportOperation from '../types/SupportOperation';

const handler: Operation.WithHandler<typeof SupportOperation.CaptureUserFeedback> =
  SupportOperation.CaptureUserFeedback.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
        const eventUuid = yield* Effect.promise(() =>
          observability.feedback.captureUserFeedback({ message: input.message, includeLogs: input.includeLogs }),
        );
        return eventUuid;
      }),
    ),
  );

export default handler;
