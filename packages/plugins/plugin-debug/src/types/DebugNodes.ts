//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as GraphNode from '@dxos/graph/GraphNode';

import { meta } from '#meta';

/** Extracts the last dot-separated segment of a namespaced ID string for use as a node segment id. */
export const nodeId = (fullId: string): string => fullId.split('.').at(-1) ?? '';

const debugId = meta.profile.key;

/** Top-level Debug node, under the debug category. */
export const id = `${debugId}.debug`;

/** Discriminator for the space-generator article surface (`node.data.type`). */
export const SpaceType = `${debugId}.space`;

/** Qualified id of the hidden debug category, the root of the debug panel's tree. */
export const DEBUG_ROOT_ID = `${GraphNode.RootId}/debug`;

/** Qualified id of the Debug node, which hosts the panel's own pages. */
export const DEBUG_NODE_ID = `${DEBUG_ROOT_ID}/${nodeId(id)}`;

/** Node data of the Effect-CLI console page. */
export const Console = `${debugId}.console`;

/** Qualified id of the console page: what a pristine panel opens on. */
export const CONSOLE_NODE_ID = `${DEBUG_NODE_ID}/${nodeId(Console)}`;

/** Node data of the log viewer page. */
export const Logs = `${debugId}.logs`;

/** Qualified id of the log viewer page. */
export const LOGS_NODE_ID = `${DEBUG_NODE_ID}/${nodeId(Logs)}`;
