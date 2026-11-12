//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';

const Index = Capability.makeSingleton<Map<string, string>>()(
  'com.example.plugin.search.capability.index',
);

// #region declare
// The last segment of the NSID must be camelCase; the compiler rejects
// `index-ready`.
export const IndexRequested = ActivationEvent.make(
  'com.example.plugin.search.event.indexRequested',
);

// Every plugin has a start event of its own, fired on demand and by the host's
// idle trickle.
export const SearchStart = ActivationEvent.pluginStart(
  'com.example.plugin.search',
);
// #endregion

// #region activates-on
export const IndexModule = Capability.inlineModule(
  'Index',
  {
    provides: [Index],
    activatesOn: ActivationEvent.oneOf(IndexRequested, SearchStart),
  },
  () => Effect.succeed(Capability.contribute(Index, new Map())),
);
// #endregion

// #region requires
// No `activatesOn`: this module waits for `Index`, so it activates whenever the
// module above does.
export const QueryModule = Capability.inlineModule(
  'Query',
  { requires: [Index], provides: [] },
  () =>
    Effect.gen(function* () {
      const index = yield* Index;
      console.log(index.size);
    }),
);
// #endregion

// #region fire
export const requestIndex = Plugin.activate(IndexRequested);
// #endregion

// #region builtin
export const events = [
  ActivationEvents.Startup,
  ActivationEvents.Idle,
  ActivationEvents.SurfacesRequested('org.dxos.role.article'),
];
// #endregion
