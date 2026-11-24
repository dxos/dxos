//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';

/** The element kinds the studio deck's drawings are drawn by; without them a slide shows each card as a plain box. */
export default Capability.makeModule(() =>
  Effect.gen(function* () {
    // A module the framework loads by URL gets none of the CSS its static imports carry, so the kinds come through
    // a dynamic import, which the bundler loads together with their stylesheet.
    const { STUDIO_KINDS } = yield* Effect.promise(() => import('../samples/cloudflare/kinds/registry.ts'));
    return Object.entries(STUDIO_KINDS).map(([type, spec]) =>
      Capability.contribute(CanvasCapabilities.NodeType, { type, spec }),
    );
  }),
);
