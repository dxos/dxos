//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type Context, createContext } from 'react';

import type { TimerCallback, TimerOptions } from '@dxos/async';

export type DebugContextType = {
  running: boolean;
  start: (cb: TimerCallback, options: TimerOptions) => void;
  stop: () => void;
};

export const DebugContext: Context<DebugContextType> = createContext<DebugContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export const DebugSettingsSchema = Schema.mutable(
  Schema.Struct({
    wireframe: Schema.optional(Schema.Boolean),
  }),
);

export interface DebugSettingsProps extends Schema.Schema.Type<typeof DebugSettingsSchema> {}

export namespace Devtools {
  // TODO(wittjosiah): Cannot use slashes in ids until we have a router which decouples ids from url paths.
  export const id = 'dxos.org.plugin.debug.devtools';

  export namespace Client {
    export const id = `${Devtools.id}.client`;
    export const Config = `${Devtools.Client.id}.config`;
    export const Storage = `${Devtools.Client.id}.storage`;
    export const Logs = `${Devtools.Client.id}.logs`;
    export const Diagnostics = `${Devtools.Client.id}.diagnostics`;
    export const Tracing = `${Devtools.Client.id}.tracing`;
  }

  export namespace Halo {
    export const id = `${Devtools.id}.halo`;
    export const Identity = `${Devtools.Halo.id}.identity`;
    export const Devices = `${Devtools.Halo.id}.devices`;
    export const Keyring = `${Devtools.Halo.id}.keyring`;
    export const Credentials = `${Devtools.Halo.id}.credentials`;
  }

  export namespace Echo {
    export const id = `${Devtools.id}.echo`;
    export const Spaces = `${Devtools.Echo.id}.spaces`;
    export const Space = `${Devtools.Echo.id}.space`;
    export const Feeds = `${Devtools.Echo.id}.feeds`;
    export const Objects = `${Devtools.Echo.id}.objects`;
    export const Schema = `${Devtools.Echo.id}.schema`;
    export const Automerge = `${Devtools.Echo.id}.automerge`;
    export const Queues = `${Devtools.Echo.id}.queues`;
    export const Members = `${Devtools.Echo.id}.members`;
    export const Metadata = `${Devtools.Echo.id}.metadata`;
  }

  export namespace Mesh {
    export const id = `${Devtools.id}.mesh`;
    export const Signal = `${Devtools.Mesh.id}.signal`;
    export const Swarm = `${Devtools.Mesh.id}.swarm`;
    export const Network = `${Devtools.Mesh.id}.network`;
  }

  export namespace Agent {
    export const id = `${Devtools.id}.agent`;
    export const Dashboard = `${Devtools.Agent.id}.dashboard`;
    export const Search = `${Devtools.Agent.id}.search`;
  }

  export namespace Edge {
    export const id = `${Devtools.id}.edge`;
    export const Dashboard = `${Devtools.Edge.id}.dashboard`;
    export const Workflows = `${Devtools.Edge.id}.workflows`;
    export const Traces = `${Devtools.Edge.id}.traces`;
    export const Testing = `${Devtools.Edge.id}.testing`;
  }
}
