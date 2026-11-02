//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { resolveStorySpace } from '@dxos/storybook-testing';

export type StorySetupOptions = {
  /**
   * Seeds the space through plugin operations (an agent needs `createAgent` for its skills and modes). A returned
   * function runs when the plugin deactivates, before the client closes.
   */
  onReady: (props: {
    db: Database.Database;
    invoker: Capabilities.OperationInvoker;
  }) => Promise<void | (() => Promise<void>)>;
};

/** Runs the story's seeding once the space is available and operations can be invoked. */
export const StorySetupPlugin = Plugin.define<StorySetupOptions>(
  Plugin.makeMeta({ key: DXN.make('com.example.plugin.stories-agent.setup'), name: 'Story setup' }),
).pipe(
  Plugin.addModule(({ onReady }) => ({
    id: 'com.example.plugin.stories-agent.setup.module',
    // The space is not available until the client observes it.
    activatesOn: ClientEvents.SpacesAvailable,
    requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
    activate: Effect.fnUntraced(function* () {
      const invoker = yield* Capabilities.OperationInvoker;
      const client = yield* ClientCapabilities.Client;
      const space = yield* resolveStorySpace(client);
      yield* invoker.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
      const stop = yield* Effect.tryPromise(() => onReady({ db: space.db, invoker }));
      if (stop) {
        yield* Effect.addFinalizer(() => Effect.promise(stop));
      }
    }),
  })),
  Plugin.make,
);
