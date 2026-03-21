//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { ObservabilityCapabilities } from '../types';

import { SendEvent } from './definitions';

export default SendEvent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      // NOTE: This is to ensure that events fired before observability is ready are still sent.
      const observability = yield* Capability.waitFor(ObservabilityCapabilities.Observability);
      const properties = input.properties ?? {};
      observability.events.captureEvent(input.name, properties);
    }),
  ),
);
