//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { meta } from '#meta';

/**
 * Extracts the last dot-separated segment of a Devtools namespaced ID string.
 * Use this as the node segment `id` when building app-graph nodes whose `data`
 * value is one of the other constants in this namespace.
 */
export const nodeId = (fullId: string): string => fullId.split('.').at(-1) ?? '';

const devtoolsId = `${meta.profile.key}.devtools`;

export const id = devtoolsId;
export const AppGraph = `${devtoolsId}.appGraph`;
export const Debug = `${devtoolsId}.debug`;
export const ToolsExplorer = `${devtoolsId}.toolsExplorer`;

export namespace Client {
  export const id = `${devtoolsId}.client`;
  export const Config = `${Client.id}.config`;
  export const Storage = `${Client.id}.storage`;
  export const Sqlite = `${Client.id}.sqlite`;
  export const Logs = `${Client.id}.logs`;
  export const Diagnostics = `${Client.id}.diagnostics`;
}

export namespace Halo {
  export const id = `${devtoolsId}.halo`;
  export const Identity = `${Halo.id}.identity`;
  export const Devices = `${Halo.id}.devices`;
  export const Keyring = `${Halo.id}.keyring`;
  export const Credentials = `${Halo.id}.credentials`;
}

export namespace Echo {
  export const id = `${devtoolsId}.echo`;
  export const Spaces = `${Echo.id}.spaces`;
  export const Space = `${Echo.id}.space`;
  export const Feeds = `${Echo.id}.feeds`;
  export const Objects = `${Echo.id}.objects`;
  export const Schema = `${Echo.id}.schema`;
  export const Registry = `${Echo.id}.registry`;
  export const Automerge = `${Echo.id}.automerge`;
  export const Queues = `${Echo.id}.queues`;
  export const Members = `${Echo.id}.members`;
  export const Metadata = `${Echo.id}.metadata`;
}

export namespace Mesh {
  export const id = `${devtoolsId}.mesh`;
  export const Signal = `${Mesh.id}.signal`;
  export const Swarm = `${Mesh.id}.swarm`;
  export const Network = `${Mesh.id}.network`;
}

export namespace Agent {
  export const id = `${devtoolsId}.agent`;
  export const Dashboard = `${Agent.id}.dashboard`;
  export const Search = `${Agent.id}.search`;
}

export namespace Edge {
  export const id = `${devtoolsId}.edge`;
  export const Dashboard = `${Edge.id}.dashboard`;
  export const Workflows = `${Edge.id}.workflows`;
  export const Traces = `${Edge.id}.traces`;
  export const Testing = `${Edge.id}.testing`;
}
