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
    const extensions = yield* Effect.all([
      createSpaceExtensions(),
      createTypeExtensions(),
      createCollectionExtensions({ shareableLinkOrigin }),
      createCompanionExtensions(),
      createSettingsExtensions(),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
