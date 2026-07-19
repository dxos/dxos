//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { SpaceCapabilities, type SpacePluginOptions } from '#types';

import {
  createCollectionExtensions,
  createCompanionExtensions,
  createDatabaseExtensions,
  createSettingsExtensions,
  createSpaceExtensions,
} from './extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ shareableLinkOrigin = window.location.origin }: SpacePluginOptions = {}) {
    const capabilities = yield* Capability.Service;
    const getHistoryProvider = (typename: string) =>
      capabilities.getAll(SpaceCapabilities.HistoryProvider).find(({ id }) => id === typename);

    const extensions = yield* Effect.all([
      createSpaceExtensions(),
      createSettingsExtensions(),
      createDatabaseExtensions(),
      createCollectionExtensions({ shareableLinkOrigin }),
      createCompanionExtensions({ getHistoryProvider }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
