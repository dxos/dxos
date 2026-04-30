//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { type SpacePluginOptions } from '#types';

import {
  createCollectionExtensions,
  createCompanionExtensions,
  createSettingsExtensions,
  createSpaceExtensions,
  createTypeExtensions,
} from './extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ shareableLinkOrigin = window.location.origin }: SpacePluginOptions = {}) {
    // Within a position bucket (hoist/static/fallback) the navtree preserves
    // emission order. Settings (hoist) is registered before Collections (also
    // hoist) so General settings + Members render above Collections.
    const extensions = yield* Effect.all([
      createSpaceExtensions(),
      createTypeExtensions(),
      createSettingsExtensions(),
      createCollectionExtensions({ shareableLinkOrigin }),
      createCompanionExtensions(),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
