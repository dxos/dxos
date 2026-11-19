//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';

import { STUDIO_KINDS } from '../samples/cloudflare/kinds/registry.ts';

/** The element kinds the studio deck's drawings are drawn by; without them a slide shows each card as a plain box. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Object.entries(STUDIO_KINDS).map(([type, spec]) =>
      Capability.contribute(CanvasCapabilities.NodeType, { type, spec }),
    ),
  ),
);
