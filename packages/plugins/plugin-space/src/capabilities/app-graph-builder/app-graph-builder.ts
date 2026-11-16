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
    readOnly = false,
  }: SpaceSchema.SpacePluginOptions = {}) {
    const extensions = yield* Effect.all([
      createSpaceExtensions({ publication, readOnly }),
      createCollectionExtensions({ shareableLinkOrigin, publication, readOnly }),
      createCompanionExtensions({ readOnly }),
      createDatabaseExtensions({ readOnly }),
      ...(readOnly ? [] : [createSettingsExtensions(), createExportExtensions(), createPeerExtensions()]),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
