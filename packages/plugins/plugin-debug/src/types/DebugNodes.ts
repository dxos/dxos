//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { meta } from '#meta';

/** Extracts the last dot-separated segment of a namespaced ID string for use as a node segment id. */
export const nodeId = (fullId: string): string => fullId.split('.').at(-1) ?? '';

const debugId = meta.profile.key;

/** Top-level Debug node (sibling of DevTools under the SYSTEM navtree group). */
export const id = `${debugId}.debug`;

/** Discriminator for the space-generator article surface (`node.data.type`). */
export const SpaceType = `${debugId}.space`;
