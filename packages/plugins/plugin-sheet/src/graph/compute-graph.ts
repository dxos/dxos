//
// Copyright 2024 DXOS.org
//

import { type FunctionPluginDefinition, HyperFormula } from 'hyperformula';
import { type ConfigParams } from 'hyperformula/typings/ConfigParams';
import { type FunctionTranslationsPackage } from 'hyperformula/typings/interpreter';

import { Event } from '@dxos/async';
import { type SpaceId, type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { FunctionContext, type FunctionContextOptions } from './async-function';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';
import { FunctionManager } from './function-manager';

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
  plugins: [
    {
      plugin: EdgeFunctionPlugin,
      translations: EdgeFunctionPluginTranslations,
    },
  ],
};

/**
 * NOTE: Async imports to decouple hyperformula deps.
 */
export const createComputeGraphRegistry = (options: Partial<FunctionContextOptions> = {}) => {
  return new ComputeGraphRegistry({
    ...defaultOptions,
    ...options,
  });
};

/**
 * Registry of compute graphs for each space.
 */
// TODO(burdon): Move graph into separate plugin.
export class ComputeGraphRegistry extends Resource {
  private readonly _registry = new Map<SpaceId, ComputeGraph>();

  constructor(private readonly _options: ComputeGraphOptions = defaultOptions) {
    super();
    this._options.plugins?.forEach(({ plugin, translations }) => {
      HyperFormula.registerFunctionPlugin(plugin, translations);
    });
  }

  getGraph(spaceId: SpaceId): ComputeGraph | undefined {
    return this._registry.get(spaceId);
  }

  async getOrCreateGraph(space: Space): Promise<ComputeGraph> {
    let graph = this.getGraph(space.id);
    if (!graph) {
      graph = await this.createGraph(space);
    }

    return graph;
  }

  async createGraph(space: Space): Promise<ComputeGraph> {
    const hf = HyperFormula.buildEmpty(this._options);
    invariant(!this._registry.has(space.id), `Already exists: ${space.id}`);
    const graph = new ComputeGraph(hf, space, this._options);
    await graph.open(this._ctx);
    this._registry.set(space.id, graph);
    return graph;
  }
}

/**
 * Per-space compute and dependency graph.
 * Consists of multiple ComputeNode (sheets).
 */
export class ComputeGraph extends Resource {
  public readonly id = `graph-${PublicKey.random().truncate()}`;

  public readonly update = new Event();

  // The context is passed to all functions.
  public readonly context = new FunctionContext(this._hf, this._space, this.refresh.bind(this), this._options);

  private readonly _functions: FunctionManager;

  constructor(
    private readonly _hf: HyperFormula,
    private readonly _space?: Space,
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    super();

    // TODO(burdon): Create separate instance per graph (i.e., per space).
    this._hf.updateConfig({ context: this.context });
    this._functions = new FunctionManager(this, _space);
  }

  get hf() {
    return this._hf;
  }

  get functions() {
    return this._functions;
  }

  protected override async _open() {
    await this._functions.open(this._ctx);
  }

  /**
   * Get or create cell representing a sheet.
   */
  getNode(id: string): ComputeNode {
    invariant(id.length);
    if (!this._hf.doesSheetExist(id)) {
      this._hf.addSheet(id);
    }

    const sheetId = this._hf.getSheetId(id);
    invariant(sheetId !== undefined);
    return new ComputeNode(this, sheetId);
  }

  refresh() {
    log('refresh', { id: this.id });
    this.update.emit();
  }
}

/**
 * Individual sheet (typically corresponds to an ECHO object).
 */
export class ComputeNode {
  constructor(
    public readonly graph: ComputeGraph,
    public readonly sheetId: number,
  ) {}

  get hf() {
    return this.graph.hf;
  }
}
