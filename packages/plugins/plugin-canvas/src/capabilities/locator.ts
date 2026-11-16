//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { CanvasOperation } from '#types';

/** A drawing's anchor is its 2D camera, so a peer's Jump and follow show the canvas where they look. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const locator: AppCapabilities.Locator = {
      id: Type.getTypename(Drawing.Drawing),
      reveal: CanvasOperation.ScrollToAnchor,
    };
    return Capability.contribute(AppCapabilities.Locator, locator);
  }),
);
