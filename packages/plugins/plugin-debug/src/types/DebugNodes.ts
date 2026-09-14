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

/** Node data of the Effect-CLI console page. */
export const Console = `${debugId}.console`;

/** Node data of the log viewer page. */
export const Logs = `${debugId}.logs`;
