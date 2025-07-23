//
// Copyright 2024 DXOS.org
//

import type { FunctionPluginDefinition } from 'hyperformula';
import type { ConfigParams } from 'hyperformula/typings/ConfigParams';
import type { FunctionTranslationsPackage } from 'hyperformula/typings/interpreter';
import defaultsDeep from 'lodash.defaultsdeep';

import { type SpaceId, type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { HyperFormula } from '#hyperformula';

import { ComputeGraph } from './compute-graph';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations, type FunctionContextOptions } from './functions';

export type ComputeGraphPlugin = {
  plugin: FunctionPluginDefinition;
  translations: FunctionTranslationsPackage;
};

export type ComputeGraphOptions = {
  plugins?: ComputeGraphPlugin[];
} & Partial<FunctionContextOptions> &
  Partial<ConfigParams>;

export const defaultOptions: ComputeGraphOptions = {
  licenseKey: 'gpl-v3',
};

export const defaultPlugins: ComputeGraphPlugin[] = [
  {
    plugin: EdgeFunctionPlugin,
    translations: EdgeFunctionPluginTranslations,
  },
];

/**
 * Manages a collection of ComputeGraph instances for each space.
 *
 * [ComputePlugin] => [ComputeGraphRegistry] => [ComputeGraph(Space)] => [ComputeNode(Object)]
 *
 * NOTE: The ComputeGraphRegistry manages the hierarchy of resources via its root Context.
 * NOTE: The package.json file defines the packaged #hyperformula module.
 */
// TODO(burdon): Move graph into separate plugin; isolate HF deps.
export class ComputeGraphRegistry extends Resource {
  private readonly _graphs = new Map<SpaceId, ComputeGraph>();

  private readonly _options: ComputeGraphOptions;

  constructor(options: ComputeGraphOptions = { plugins: defaultPlugins }) {
    super();
    this._options = defaultsDeep({}, options, defaultOptions);
    this._options.plugins?.forEach(({ plugin, translations }) => {
      HyperFormula.registerFunctionPlugin(plugin, translations);
    });
  }

  getGraph(spaceId: SpaceId): ComputeGraph | undefined {
    return this._graphs.get(spaceId);
  }

  getOrCreateGraph(space: Space): ComputeGraph {
    let graph = this._graphs.get(space.id);
    if (!graph) {
      log('create graph', { space: space.id });
      graph = this.createGraph(space);
    }

    return graph;
  }

  createGraph(space: Space): ComputeGraph {
    invariant(!this._graphs.has(space.id), `ComputeGraph already exists for space: ${space.id}`);
    const hf = HyperFormula.buildEmpty(this._options);
    const graph = new ComputeGraph(hf, space, this._options);
    this._graphs.set(space.id, graph);
    return graph;
  }

  protected override async _close(): Promise<void> {
    for (const graph of this._graphs.values()) {
      await graph.close();
    }
    this._graphs.clear();
  }
}
