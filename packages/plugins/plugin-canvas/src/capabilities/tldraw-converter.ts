//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';

import { tldrawConverter } from '../import/index.ts';

// Contributed here, keyed by the tldraw dialect, so plugin-tldraw takes no dependency on this plugin.
export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(IllustratorCapabilities.Converter, tldrawConverter)),
);
