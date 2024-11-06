//
// Copyright 2024 DXOS.org
//

import { type Listeners } from 'hyperformula/typings/Emitter';

import { Event } from '@dxos/async';
import { type Space, Filter, fullyQualifiedId } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { getTypename } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { FunctionType } from '@dxos/plugin-script/types';
import { nonNullable } from '@dxos/util';

import { ExportedCellChange, type HyperFormula } from '#hyperformula';
import { ComputeNode } from './compute-node';
import {
  defaultFunctions,
  FunctionContext,
  type FunctionContextOptions,
  type FunctionDefinition,
  EDGE_FUNCTION_NAME,
} from './functions';

// TODO(burdon): Factor out compute-graph.

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 1 (separator) + 26 (object id).

// TODO(burdon): Factory.
// export type ComputeNodeGenerator = <T>(obj: T) => ComputeNode;

type ObjectRef = { type: string; id: string };

/**
 * Marker for sheets that are managed by an ECHO object.
 * Sheet ID: `dxos.org/type/SheetType@1234`
 */
export const createSheetName = ({ type, id }: ObjectRef) => `${type}@${id}`;
export const parseSheetName = (name: string): Partial<ObjectRef> => {
  const [type, id] = name.split('@');
  return id ? { type, id } : { id: type };
};

export type ComputeGraphEvent = 'functionsUpdated';

/**
 * Per-space compute and dependency graph.
 * Consists of multiple ComputeNode (corresponding to a HyperFormula sheet).
 * Manages the set of custom functions.
 * HyperFormula manages the dependency graph.
 */
export class ComputeGraph extends Resource {
  public readonly id = `graph-${PublicKey.random().truncate()}`;

  // Map of nodes indexed by sheet number.
  private readonly _nodes = new Map<number, ComputeNode>();

  // Cached function objects.
  private _remoteFunctions: FunctionType[] = [];

  public readonly update = new Event<{ type: ComputeGraphEvent }>();

  // The context is passed to all functions.
  public readonly context = new FunctionContext(this._hf, this._space, this._options);

  constructor(
    private readonly _hf: HyperFormula,
    private readonly _space?: Space,
    private readonly _options?: Partial<FunctionContextOptions>,
  ) {
    super();
    this._hf.updateConfig({ context: this.context });

    // TODO(burdon): If debounce then aggregate changes.
    const onValuesUpdate: Listeners['valuesUpdated'] = (changes) => {
      for (const change of changes) {
        if (change instanceof ExportedCellChange) {
          const { sheet } = change;
          const node = this._nodes.get(sheet);
          if (node) {
            node.update.emit({ type: 'valuesUpdated', change });
          }
        }
      }
    };

    this._hf.on('valuesUpdated', onValuesUpdate);
    this._ctx.onDispose(() => this._hf.off('valuesUpdated', onValuesUpdate));
  }

  get hf() {
    return this._hf;
  }

  getFunctions(
    { standard, echo }: { standard?: boolean; echo?: boolean } = { standard: true, echo: true },
  ): FunctionDefinition[] {
    return [
      ...(standard
        ? this._hf
            .getRegisteredFunctionNames()
            .map((name) => defaultFunctions.find((fn) => fn.name === name) ?? { name })
        : []),
      ...(echo ? this._remoteFunctions.map((fn) => ({ name: fn.binding! })) : []),
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
      log('created node', { space: this._space?.id, sheet: name });
      this._hf.addSheet(name);
    }

    const sheetId = this._hf.getSheetId(name);
    invariant(sheetId !== undefined);

    const node = new ComputeNode(this, sheetId);
    this._nodes.set(sheetId, node);
    return node;
  }

  /**
   * Map bound value to custom function invocation.
   * E.g., "HELLO(...args)" => "DX("HELLO", ...args)".
   */
  mapFormulaToNative(formula: string): string {
    return (
      formula
        //
        // Map cross-sheet references by name onto sheet stored by ECHO object/model.
        // Example: "Test Sheet"!A0 => "dxos.org/type/SheetType@1234"!A0
        // https://hyperformula.handsontable.com/guide/cell-references.html#cell-references
        //
        .replace(/['"]?([ \w]+)['"]?!/, (_match, name) => {
          if (name) {
            // TODO(burdon): Cache map.
            const objects = this._hf
              .getSheetNames()
              .map((name) => {
                const { type, id } = parseSheetName(name);
                return type && id ? this._space?.db.getObjectById(id) : undefined;
              })
              .filter(nonNullable);

            for (const obj of objects) {
              if (obj.name === name) {
                const type = getTypename(obj)!;
                // NOTE: Names must be single quoted.
                return `'${createSheetName({ type, id: obj.id })}'!`;
              }
            }
          }

          return `${name}!`;
        })

        //
        // Map remote function references (i.e., to remote DX function invocation).
        //
        .replace(/(\w+)\((.*)\)/g, (match, binding, args) => {
          const fn = this._remoteFunctions.find((fn) => fn.binding === binding);
          if (!fn) {
            return match;
          }

          if (args.trim() === '') {
            return `${EDGE_FUNCTION_NAME}("${binding}")`;
          } else {
            return `${EDGE_FUNCTION_NAME}("${binding}", ${args})`;
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
      if (binding === EDGE_FUNCTION_NAME || defaultFunctions.find((fn) => fn.name === binding)) {
        return match;
      }

      const fn = this._remoteFunctions.find((fn) => fn.binding === binding);
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

      const fn = this._remoteFunctions.find((fn) => fullyQualifiedId(fn) === id);
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
        this._remoteFunctions = objects.filter(({ binding }) => binding);
        this.update.emit({ type: 'functionsUpdated' });
      });

      this._ctx.onDispose(unsubscribe);
    }
  }

  protected override async _close() {
    for (const node of this._nodes.values()) {
      await node.close();
    }
  }
}
