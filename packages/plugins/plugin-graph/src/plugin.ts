//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from '#meta';

import { Graph } from './graph.ts';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = Plugin.define(meta).pipe(Plugin.addModule(Graph), Plugin.make);

export default GraphPlugin;
