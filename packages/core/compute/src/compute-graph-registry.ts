//
// Copyright 2024 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type Space, type SpaceId } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type AutomationCapabilities } from '@dxos/plugin-automation';
import type { ConfigParams, FunctionPluginDefinition, FunctionTranslationsPackage } from '@dxos/vendor-hyperformula';
import { HyperFormula } from '@dxos/vendor-hyperformula';

import { ComputeGraph } from './compute-graph';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations, type FunctionContextOptions } from './functions';

export type ComputeGraphPlugin = {
  plugin: FunctionPluginDefinition;
  translations: FunctionTranslationsPackage;
};

export type ComputeGraphOptions = {
  plugins?: ComputeGraphPlugin[];
  computeRuntime: AutomationCapabilities.ComputeRuntimeProvider;
} & Partial<FunctionContextOptions> &
  Partial<ConfigParams>;

export const defaultPlugins: ComputeGraphPlugin[] = [
  {
    plugin: EdgeFunctionPlugin,
    translations: EdgeFunctionPluginTranslations,
  },
];

export const defaultOptions: Partial<ComputeGraphOptions> = {
  licenseKey: 'gpl-v3',
  plugins: defaultPlugins,
};

/**
 * Manages a collection of ComputeGraph instances for each space.
 *
 * [ComputePlugin] => [ComputeGraphRegistry] => [ComputeGraph(Space)] => [ComputeNode(Object)]
 *
 * NOTE: The ComputeGraphRegistry manages the hierarchy of resources via its root Context.
 */
// TODO(burdon): Move graph into separate plugin; isolate HF deps.
export class ComputeGraphRegistry extends Resource {
  private readonly _graphs = new Map<SpaceId, ComputeGraph>();
  private readonly _options: ComputeGraphOptions;

  constructor(options: ComputeGraphOptions) {
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
    invariant(this._options.computeRuntime, 'ComputeRuntime is required');
    const runtime = this._options.computeRuntime.getRuntime(space.id);

    const graph = new ComputeGraph(hf, runtime, space, this._options);
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
