//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ObservabilityExtension from '../../ObservabilityExtension';
import { stubExtension } from '../stub';

/** Browser stand-in for `./node`, so `posthog-node` stays out of a browser bundle's graph. */
export const extensions = (): Effect.Effect<ObservabilityExtension.Extension> => Effect.succeed(stubExtension);
