//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { SpaceSchema } from '#types';

import {
  createCollectionExtensions,
  createCompanionExtensions,
  createDatabaseExtensions,
  createSettingsExtensions,
  createSpaceExtensions,
} from './extensions/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ shareableLinkOrigin = window.location.origin }: SpaceSchema.SpacePluginOptions = {}) {
    const extensions = yield* Effect.all([
      createSpaceExtensions(),
      createSettingsExtensions(),
      createDatabaseExtensions(),
      createCollectionExtensions({ shareableLinkOrigin }),
      createCompanionExtensions(),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
