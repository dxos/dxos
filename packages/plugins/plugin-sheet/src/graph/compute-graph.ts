//
// Copyright 2024 DXOS.org
//

import { type FunctionPluginDefinition, HyperFormula } from 'hyperformula';
import { type FunctionTranslationsPackage } from 'hyperformula/typings/interpreter';

import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type SpaceId } from '@dxos/keys/src';
import { log } from '@dxos/log';

import { FunctionContext, type FunctionContextOptions } from './async-function';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';

/**
 * NOTE: Async imports to decouple hyperformula deps.
 */
export const createComputeGraphRegistry = async (options: Partial<FunctionContextOptions>) => {
  const registry = new ComputeGraphRegistry(options);
  await registry.initialize([{ plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations }]);
  return registry;
};

export type ComputeGraphPlugin = {
  plugin: FunctionPluginDefinition;
  translations: FunctionTranslationsPackage;
};

/**
 * Registry of compute graphs for each space.
 */
// TODO(burdon): Factor graph into separate plugin.
export class ComputeGraphRegistry {
  private readonly _registry = new Map<SpaceId, ComputeGraph>();
  private _hf?: HyperFormula;

  constructor(private readonly _options?: Partial<FunctionContextOptions>) {}

  get initialized() {
    return !!this._hf;
  }

  async initialize(plugins: ComputeGraphPlugin[] = []) {
    plugins.forEach(({ plugin, translations }) => {
      HyperFormula.registerFunctionPlugin(plugin, translations);
    });

    this._hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
  }

  async destroy() {
    this._hf?.destroy();
  }

  getGraph(spaceId: SpaceId): ComputeGraph | undefined {
    return this._registry.get(spaceId);
  }

  async createGraph(space: Space): Promise<ComputeGraph> {
    invariant(this._hf, 'Not initialized.');
    invariant(!this._registry.has(space.id), `Already exists: ${space.id}`);
    const graph = new ComputeGraph(this._hf, space, this._options);
    this._registry.set(space.id, graph);
    return graph;
  }
}

/**
 * Per-space compute and dependency graph.
 */
export class ComputeGraph {
  public readonly id = `graph-${PublicKey.random().truncate()}`;
  public readonly update = new Event();

  // The context is passed to all functions.
  public readonly context = new FunctionContext(
    this.hf,
    this._space,
    () => {
      this.refresh();
    },
    this._options,
  );

  constructor(
    public readonly hf: HyperFormula,
    private readonly _space?: Space,
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    this.hf.updateConfig({ context: this.context });
  }

  refresh() {
    log('refresh', { id: this.id });
    this.update.emit();
  }
}
