//
// Copyright 2025 DXOS.org
//

import { HttpClient } from '@effect/platform';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

export const tapHttpErrors = HttpClient.tap(
  Effect.fn(function* (res) {
    if (res.status > 299) {
      log.error(`Response failed with code ${res.status}:\n`, yield* res.text);
    }
  }),
);
