//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN, Ref } from '@dxos/echo';
// Referenced in the emitted .d.ts of the operations (via `ConnectorSpec`'s schemas); importing it
// lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import * as CloudflareOs from './CloudflareOs.ts';

/** The id of the sync target that creates a fresh workspace instead of binding an existing one. */
export const NEW_WORKSPACE_TARGET = 'new';

/** Lists the account's workspaces, plus a target that creates a new one, as the connection's sync targets. */
export const GetWorkspaces = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.cloudflareOs.getWorkspaces'),
    name: 'Get Cloudflare OS Workspaces',
    description: 'List the Cloudflare OS workspaces a connection can bind to a space.',
    icon: 'ph--cloud--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

/** Finds or creates the space's `Workspace` object for a picked workspace, creating the workspace when asked. */
export const MaterializeWorkspace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.cloudflareOs.materializeWorkspace'),
    name: 'Bind Cloudflare OS Workspace',
    description: 'Bind a Cloudflare OS workspace to the space, creating the workspace if none was picked.',
    icon: 'ph--cloud--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/** Refreshes the title and gadget list of every workspace the connection binds. */
export const SyncWorkspaces = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.cloudflareOs.syncWorkspaces'),
    name: 'Sync Cloudflare OS Workspaces',
    description: 'Refresh the title and gadget list of the Cloudflare OS workspaces bound in the space.',
    icon: 'ph--cloud--regular',
  },
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({ workspaces: Schema.Number }),
});

/** Refreshes one workspace's title and gadget list. */
export const RefreshWorkspace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.cloudflareOs.refreshWorkspace'),
    name: 'Refresh Cloudflare OS Workspace',
    description: 'Refresh the title and gadget list of a Cloudflare OS workspace.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({ workspace: Ref.Ref(CloudflareOs.Workspace) }),
  output: Schema.Struct({ gadgets: Schema.Number }),
});
