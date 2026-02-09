//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

export const tapHttpErrors = HttpClient.tap(
  Effect.fn(function* (res) {
    if (res.status > 299) {
      log.error(`Response failed with code ${res.status}:\n`, yield* res.text);
    }
  }),
);
