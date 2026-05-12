//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { ObservabilityCapabilities, ObservabilityOperation } from '../types';

const handler: Operation.WithHandler<typeof ObservabilityOperation.CaptureUserFeedback> =
  ObservabilityOperation.CaptureUserFeedback.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
        observability.feedback.captureUserFeedback({ message: input.message, includeLogs: input.includeLogs });
      }),
    ),
  );

export default handler;
