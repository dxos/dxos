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
  createExportExtensions,
  createPeerExtensions,
  createSettingsExtensions,
  createSpaceExtensions,
} from './extensions/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({
    shareableLinkOrigin = window.location.origin,
    publication,
  }: SpaceSchema.SpacePluginOptions = {}) {
    const extensions = yield* Effect.all([
      createSpaceExtensions({ publication }),
      createSettingsExtensions(),
      createDatabaseExtensions(),
      createCollectionExtensions({ shareableLinkOrigin, publication }),
      createCompanionExtensions(),
      createExportExtensions(),
      createPeerExtensions(),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
