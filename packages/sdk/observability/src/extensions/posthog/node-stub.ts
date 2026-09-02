//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Extension } from '../../observability-extension';
import { stubExtension } from '../stub';

/** Browser stand-in for `./node`, so `posthog-node` stays out of a browser bundle's graph. */
export const extensions = (): Effect.Effect<Extension> => Effect.succeed(stubExtension);
