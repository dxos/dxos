//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { Summarizer } from '../contracts/index.ts';
import { Service, ServiceHost, State } from '../services/index.ts';

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.stories.services.plugin.summarizer'), name: 'Summarizer' });

const provider = Service.provide(Summarizer.Contract, {
  needs: [Summarizer.GATEWAY_FEATURE],
  make: ({ feature }) =>
    Effect.sync(() => {
      const gateway = feature<Summarizer.Gateway>(Summarizer.GATEWAY_FEATURE);
      const status = State.cell<'idle' | 'busy'>('idle');
      const completed = State.emitter<{ tokens: number }>();
      const summarizer: Summarizer.Client = {
        summarize: ({ text }) => {
          let tokens = 0;
          return Stream.suspend(() => {
            status.set('busy');
            return gateway.complete(`Summarize: ${text}`);
          }).pipe(
            Stream.tap(() => Effect.sync(() => tokens++)),
            Stream.ensuring(
              Effect.sync(() => {
                status.set('idle');
                completed.emit({ tokens });
              }),
            ),
          );
        },
        status: status.property,
        completed: completed.stream,
      };
      return summarizer;
    }),
});

/** Provides `Summarizer` wherever the host has an AI gateway. */
const SummarizerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'provider',
    provides: [ServiceHost.Provider],
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed([Capability.contribute(ServiceHost.Provider, provider)]),
  }),
  Plugin.make,
);

export default SummarizerPlugin;
