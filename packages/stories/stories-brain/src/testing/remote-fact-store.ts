//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import { FactStore, FactStoreHttp } from '@dxos/pipeline-rdf';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';

/** Where `moon run plugin-discord:fact-server` listens by default. */
export const DEFAULT_FACT_SERVER_URL = 'http://127.0.0.1:7700';

/**
 * Stands in for `BrainPlugin`'s fact-store registry with one {@link FactStoreHttp} client, so every space's store is
 * the remote one a fact server exposes (e.g. a persisted Discord crawl). Use it instead of `BrainPlugin`, whose
 * registry capability is a singleton.
 */
export const RemoteFactStorePlugin = (url: string) =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories.brain.remoteFactStore'), name: 'Remote Fact Store' }),
  ).pipe(
    Plugin.addModule({
      id: 'remote-fact-store',
      provides: [BrainCapabilities.FactStoreRegistry],
      activate: Capability.makeModule(
        Effect.fnUntraced(function* () {
          const store = FactStoreHttp.make(url);
          return Capability.contribute(BrainCapabilities.FactStoreRegistry, {
            forSpace: () => store,
            layerFor: () => Layer.succeed(FactStore, store),
            // The server has no change feed; the explorer re-queries on demand.
            subscribe: () => () => {},
          });
        }),
      ),
    }),
    Plugin.make,
  )();
