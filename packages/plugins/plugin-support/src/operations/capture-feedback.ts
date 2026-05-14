//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';

import { SupportOperation } from '../types';

const handler: Operation.WithHandler<typeof SupportOperation.CaptureUserFeedback> =
  SupportOperation.CaptureUserFeedback.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
        observability.feedback.captureUserFeedback({ message: input.message, includeLogs: input.includeLogs });
      }),
    ),
  );

export default handler;
