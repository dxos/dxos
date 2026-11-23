//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { makeClient } from '#client';
import { LighthouseCapabilities } from '#types';

/** The HTTP client, for any http(s) endpoint. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(LighthouseCapabilities.ClientFactory, {
      match: (url) => /^https?:\/\//.test(url),
      make: makeClient,
    }),
  ),
);
