//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Atom from 'effect/reactivity/Atom';
import React from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { Layout, type LayoutProps } from './Layout.tsx';

/** The error each module failed with, by module id. */
export const ModuleErrors = Capability.makeSingleton<Atom.Writable<Readonly<Record<string, Error>>>>()(
  'org.dxos.plugin.inspector.capability.moduleErrors',
);

export type InspectorPluginOptions = LayoutProps;

/** The inspector's own plugin: its layout, and a record of every module that fails to activate. */
export const InspectorPlugin = Plugin.define<InspectorPluginOptions>(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inspector'),
    name: 'Inspector',
    tags: ['system'],
  }),
).pipe(
  Plugin.addModule({
    id: 'ModuleErrors',
    activatesOn: ActivationEvents.Startup,
    provides: [ModuleErrors],
    activate: () =>
      Effect.gen(function* () {
        const manager = yield* Plugin.Service;
        const errors = Atom.make<Readonly<Record<string, Error>>>({}).pipe(Atom.keepAlive);
        const messages = yield* PubSub.subscribe(manager.activation);
        yield* PubSub.take(messages).pipe(
          Effect.tap(({ module, state, error }) =>
            Effect.sync(() => {
              if (module && state === 'error' && error) {
                manager.registry.update(errors, (current) => ({ ...current, [module]: error }));
              }
            }),
          ),
          Effect.forever,
          Effect.forkScoped,
        );
        return Capability.contribute(ModuleErrors, errors);
      }),
  }),
  Plugin.addModule((options: InspectorPluginOptions) => ({
    id: 'Layout',
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.ReactRoot],
    activate: () =>
      Effect.succeed(
        Capability.contribute(Capabilities.ReactRoot, {
          id: 'org.dxos.plugin.inspector.root',
          root: () => <Layout {...options} />,
        }),
      ),
  })),
  Plugin.make,
);
