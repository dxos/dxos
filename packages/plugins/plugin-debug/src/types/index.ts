//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { type Context, createContext } from 'react';

import { Capability } from '@dxos/app-framework';
import type { TimerCallback, TimerOptions } from '@dxos/async';
import { type IdbLogStore } from '@dxos/log-store-idb';

import { meta } from '#meta';

import * as Settings from './Settings';

export * from './surface';
export * as Settings from './Settings';

export type DebugPluginOptions = {
  /** Shared persistent log store for capturing and downloading logs. */
  logStore?: IdbLogStore;
};

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

export namespace DebugCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.profile.key}.capability.settings`);
}

/**
 * Extracts the last dot-separated segment of a Devtools namespaced ID string.
 * Use this as the node segment `id` when building app-graph nodes whose `data`
 * value is one of the `Devtools.*` constants.
 */
export const nodeId = (fullId: string): string => fullId.split('.').at(-1) ?? '';

export namespace Devtools {
  export const id = `${meta.profile.key}.devtools`;

  /** App-graph node IDs that have no corresponding surface-data constant. */
  export const AppGraph = 'appGraph';
  export const Debug = 'debug';

  export const ToolsExplorer = `${Devtools.id}.toolsExplorer`;

  export namespace Client {
    export const id = `${Devtools.id}.client`;
    export const Config = `${Devtools.Client.id}.config`;
    export const Storage = `${Devtools.Client.id}.storage`;
    export const Sqlite = `${Devtools.Client.id}.sqlite`;
    export const Logs = `${Devtools.Client.id}.logs`;
    export const Diagnostics = `${Devtools.Client.id}.diagnostics`;
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
    export const Registry = `${Devtools.Echo.id}.registry`;
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
