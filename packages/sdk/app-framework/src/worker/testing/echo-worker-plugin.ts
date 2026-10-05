//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import { ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { RpcRouter } from '@dxos/rpc';

import * as Capabilities from '../../common/capabilities.ts';
import * as Capability from '../../core/capability.ts';
import * as Plugin from '../../core/plugin.ts';
import * as WorkerCapabilities from '../WorkerCapabilities.ts';
import * as WorkerEvents from '../WorkerEvents.ts';
import { EchoRpcs } from './echo-rpcs.ts';

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.echoWorker'), name: 'Echo Worker' });

const Echo = Capability.inlineModule(
  'Echo',
  {
    activatesOn: WorkerEvents.Startup,
    requires: [WorkerCapabilities.Host],
    provides: [Capabilities.LayerSpec],
  },
  Effect.fnUntraced(function* () {
    const host = yield* Capability.get(WorkerCapabilities.Host);
    let sessions = 0;
    yield* Hook.on(WorkerEvents.SessionOpened, () => Effect.sync(() => sessions++)).pipe(
      Effect.provideService(Hook.Controller, host.hooks),
    );

    const spec = LayerSpec.make(
      { affinity: 'application', requires: [RpcRouter.RpcRouter, ConfigService], provides: [], eager: true },
      () =>
        Layer.effectDiscard(
          Effect.gen(function* () {
            const config = yield* ConfigService;
            yield* RpcRouter.serve('echo.', EchoRpcs).pipe(
              Effect.provide(
                EchoRpcs.toLayer({
                  'echo.echo': ({ text }) => Effect.succeed(`${config.get('runtime.app.org')}:${text}`),
                  'echo.sessions': () => Effect.sync(() => sessions),
                }),
              ),
            );
          }),
        ),
    );
    return Capability.contribute(Capabilities.LayerSpec, spec);
  }),
);

/** A worker plugin reached by URL: serves {@link EchoRpcs} and counts sessions off the hook bus. */
export default Plugin.define(meta).pipe(Plugin.addModule(Echo), Plugin.make);
