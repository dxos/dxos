//
// Copyright 2024 DXOS.org
//

import { type FunctionPluginDefinition, HyperFormula } from 'hyperformula';
import { type ConfigParams } from 'hyperformula/typings/ConfigParams';
import { type FunctionTranslationsPackage } from 'hyperformula/typings/interpreter';

import { Event } from '@dxos/async';
import { type SpaceId, type Space, Filter, fullyQualifiedId } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FunctionType } from '@dxos/plugin-script/types';
import { nonNullable } from '@dxos/util';

import { FunctionContext, type FunctionContextOptions } from './async-function';
import { ComputeNode } from './compute-node';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';
import { defaultFunctions, type FunctionDefinition } from './function-defs';

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

// TODO(burdon): Change to "DX".
const CUSTOM_FUNCTION = 'ECHO';

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
 * Marker for sheets that are managed by an ECHO object.
 */
const PREFIX = '__';
export const createSheetName = (id: string) => `${PREFIX}${id}`;
export const getSheetId = (name: string): string | undefined =>
  name.startsWith(PREFIX) ? name.slice(PREFIX.length) : undefined;

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
 * Manages a collection of ComputeGraph instances for each space.
 *
 * [ComputePlugin] => [ComputeGraphRegistry] => [ComputeGraph(Space)] => [ComputeNode(Object)]
 */
// TODO(burdon): Move graph into separate plugin; isolate HF deps.
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
      log.info('create graph', { space: space.id });
      graph = await this.createGraph(space);
    }

    return graph;
  }

  async createGraph(space: Space): Promise<ComputeGraph> {
    invariant(!this._registry.has(space.id), `ComputeGraph already exists for space: ${space.id}`);
    const hf = HyperFormula.buildEmpty(this._options);
    const graph = new ComputeGraph(hf, space, this._options);
    await graph.open(this._ctx);
    this._registry.set(space.id, graph);
    return graph;
  }
}

/**
 * Per-space compute and dependency graph.
 * Consists of multiple ComputeNode (corresponding to a HyperFormula sheet).
 * Manages the set of custom functions.
 * HyperFormula manages the dependency graph.
 */
// TODO(burdon): Tests.
export class ComputeGraph extends Resource {
  public readonly id = `graph-${PublicKey.random().truncate()}`;

  // Map of nodes indexed by sheet number.
  private readonly _nodes = new Map<number, ComputeNode>();

  // Cached function objects.
  private _functions: FunctionType[] = [];

  // The context is passed to all functions.
  public readonly context = new FunctionContext(this._hf, this._space, this.refresh.bind(this), this._options);

  // TODO(burdon): Typed events.
  // TODO(burdon): Tie into HyperFormula dependency graph.
  // TODO(burdon): Event propagation.
  public readonly update = new Event();

  constructor(
    private readonly _hf: HyperFormula,
    private readonly _space?: Space,
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    super();

    this._hf.updateConfig({ context: this.context });
  }

  // TODO(burdon): Remove.
  get hf() {
    return this._hf;
  }

  refresh() {
    log('refresh', { id: this.id });
    this.update.emit();
  }

  getFunctions({ standard = true, echo = true }: { standard?: boolean; echo?: boolean } = {}): FunctionDefinition[] {
    return [
      ...(standard
        ? this._hf
            .getRegisteredFunctionNames()
            .map((name) => defaultFunctions.find((fn) => fn.name === name) ?? { name })
        : []),
      ...(echo ? this._functions.map((fn) => ({ name: fn.binding! })) : []),
    ];
  }

  /**
   * Get or create cell representing a sheet.
   */
  // TODO(burdon): Async (open node).
  //  The graph should be an extensible factory that plugins extend with model constructors.
  //  This would enable on-the-fly instantiation of new models when then are referenced.
  //  E.g., Cross-object reference would be stored as "ObjectId!A1"
  //  The graph would then load the object and create a ComputeNode (model) of the appropriate type.
  getOrCreateNode(name: string): ComputeNode {
    invariant(name.length);
    if (!this._hf.doesSheetExist(name)) {
      log.info('created node', { space: this._space?.id, name });
      this._hf.addSheet(name);
      this.update.emit();
    }

    const sheetId = this._hf.getSheetId(name);
    invariant(sheetId !== undefined);

    // TODO(burdon): Chain context?
    const node = new ComputeNode(this, sheetId);
    this._nodes.set(sheetId, node);
    return node;
  }

  /**
   * Map bound value to custom function invocation.
   * E.g., "HELLO(...args)" => "EDGE("HELLO", ...args)".
   */
  mapFormulaToNative(formula: string): string {
    return (
      formula
        // Sheet references.
        // https://hyperformula.handsontable.com/guide/cell-references.html#cell-references
        .replace(/['"]?([ \w]+)['"]?!/, (_match, name) => {
          if (name) {
            // TODO(burdon): What if not loaded?
            const objects = this._hf
              .getSheetNames()
              .map((name) => {
                const id = getSheetId(name);
                return id ? this._space?.db.getObjectById(id) : undefined;
              })
              .filter(nonNullable);

            for (const obj of objects) {
              if (obj.name === name || obj.title === name) {
                return `${createSheetName(obj.id)}!`;
              }
            }
          }

          return `${name}!`;
        })

        // Functions.
        .replace(/(\w+)\((.*)\)/g, (match, binding, args) => {
          const fn = this._functions.find((fn) => fn.binding === binding);
          if (!fn) {
            return match;
          }

          if (args.trim() === '') {
            return `${CUSTOM_FUNCTION}("${binding}")`;
          } else {
            return `${CUSTOM_FUNCTION}("${binding}", ${args})`;
          }
        })
    );
  }

  /**
   * Map from binding to fully qualified ECHO ID (to store).
   * E.g., HELLO() => spaceId:objectId()
   */
  mapFunctionBindingToId(formula: string) {
    return formula.replace(/(\w+)\((.*)\)/g, (match, binding, args) => {
      if (binding === CUSTOM_FUNCTION || defaultFunctions.find((fn) => fn.name === binding)) {
        return match;
      }

      const fn = this._functions.find((fn) => fn.binding === binding);
      if (fn) {
        const id = fullyQualifiedId(fn);
        return `${id}(${args})`;
      } else {
        return match;
      }
    });
  }

  /**
   * Map from fully qualified ECHO ID to binding (from store).
   * E.g., spaceId:objectId() => HELLO()
   */
  mapFunctionBindingFromId(formula: string) {
    return formula.replace(/(\w+):([a-zA-Z0-9]+)\((.*)\)/g, (match, spaceId, objectId, args) => {
      const id = `${spaceId}:${objectId}`;
      if (id.length !== OBJECT_ID_LENGTH) {
        return match;
      }

      const fn = this._functions.find((fn) => fullyQualifiedId(fn) === id);
      if (fn?.binding) {
        return `${fn.binding}(${args})`;
      } else {
        return match;
      }
    });
  }

  protected override async _open() {
    if (this._space) {
      // Subscribe to remote function definitions.
      const query = this._space.db.query(Filter.schema(FunctionType));
      const unsubscribe = query.subscribe(({ objects }) => {
        this._functions = objects.filter(({ binding }) => binding);
        this.update.emit();
      });

      this._ctx.onDispose(unsubscribe);
    }
  }
}
