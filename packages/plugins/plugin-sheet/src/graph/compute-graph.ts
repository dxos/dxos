//
// Copyright 2024 DXOS.org
//

import { type FunctionPluginDefinition, HyperFormula } from 'hyperformula';
import { type FunctionTranslationsPackage } from 'hyperformula/typings/interpreter';

import { Event } from '@dxos/async';
import { type SpaceId, type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { FunctionContext, type FunctionContextOptions } from './async-function';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';

/**
 * NOTE: Async imports to decouple hyperformula deps.
 */
export const createComputeGraphRegistry = (options: Partial<FunctionContextOptions> = {}) => {
  return new ComputeGraphRegistry(
    [{ plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations }],
    options,
  );
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

  constructor(
    plugins: ComputeGraphPlugin[] = [],
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    plugins.forEach(({ plugin, translations }) => {
      HyperFormula.registerFunctionPlugin(plugin, translations);
    });
  }

  getGraph(spaceId: SpaceId): ComputeGraph | undefined {
    return this._registry.get(spaceId);
  }

  getOrCreateGraph(space: Space): ComputeGraph {
    let graph = this.getGraph(space.id);
    if (!graph) {
      graph = this.createGraph(space);
    }

    return graph;
  }

  createGraph(space: Space): ComputeGraph {
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    invariant(!this._registry.has(space.id), `Already exists: ${space.id}`);
    const graph = new ComputeGraph(hf, space, this._options);
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
    this._hf,
    this._space,
    () => {
      this.refresh();
    },
    this._options,
  );

  constructor(
    private readonly _hf: HyperFormula,
    private readonly _space?: Space,
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    // TODO(burdon): Create separate instance per graph (i.e., per space).
    this._hf.updateConfig({ context: this.context });
  }

  get hf() {
    return this._hf;
  }

  /**
   * Get or create cell representing a sheet.
   */
  getCell(id: string): ComputeCell {
    invariant(id.length);
    if (!this._hf.doesSheetExist(id)) {
      this._hf.addSheet(id);
    }

    const sheetId = this._hf.getSheetId(id);
    invariant(sheetId !== undefined);
    return new ComputeCell(this, sheetId);
  }

  refresh() {
    log('refresh', { id: this.id });
    this.update.emit();
  }
}

export class ComputeCell {
  constructor(
    public readonly graph: ComputeGraph,
    public readonly sheetId: number,
  ) {}

  get hf() {
    return this.graph.hf;
  }
}
