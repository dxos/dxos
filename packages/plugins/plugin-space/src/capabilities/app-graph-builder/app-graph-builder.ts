//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { SpaceSchema } from '#types';

import {
  createCollectionExtensions,
  createCompanionExtensions,
  createDatabaseExtensions,
  createSettingsExtensions,
  createSpaceExtensions,
} from './extensions/index.ts';

export const AppGraphBuilder = Capability.makeModule(
  'AppGraphBuilder',
  {
    // Browser-only: the builder defaults its share-link origin to `window.location.origin`, read
    // when the module activates.
    environments: [],
    provides: [AppCapabilities.AppGraphBuilder],
    // Its connectors read `client.spaces` inside atom computations (initialized-only, and a
    // pre-init throw is not re-evaluated when initialization lands).
    activatesOn: ClientEvents.Initialized,
  },
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
