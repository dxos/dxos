//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Filter, type Space, fullyQualifiedId } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { FunctionType } from '@dxos/plugin-script/types';
import { nonNullable } from '@dxos/util';

import { defaultFunctions, type FunctionDefinition } from './function-defs';
import { type ComputeGraph, createSheetName, getSheetId } from '../graph';

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

// TODO(burdon): Change to "DX".
const CUSTOM_FUNCTION = 'ECHO';

/**
 * Manages mapping between function bindings and their definitions.
 */
// TODO(burdon): Move into ComputeGraph.
export class FunctionRegistry extends Resource {
  private _functions: FunctionType[] = [];

  public readonly update = new Event();

  constructor(
    private readonly _graph: ComputeGraph,
    private readonly _space?: Space,
  ) {
    super();
  }

  protected override async _open() {
    if (this._space) {
      const query = this._space.db.query(Filter.schema(FunctionType));
      const unsubscribe = query.subscribe(({ objects }) => {
        this._functions = objects.filter(({ binding }) => binding);
        this.update.emit();
      });

      this._ctx.onDispose(unsubscribe);
    }
  }

  getFunctions({ standard = true, echo = true }: { standard?: boolean; echo?: boolean } = {}): FunctionDefinition[] {
    return [
      ...(standard
        ? this._graph.hf
            .getRegisteredFunctionNames()
            .map((name) => defaultFunctions.find((fn) => fn.name === name) ?? { name })
        : []),
      ...(echo ? this._functions.map((fn) => ({ name: fn.binding! })) : []),
    ];
  }

  /**
   * Map bound value to custom function invocation.
   * E.g., "HELLO(...args)" => "EDGE("HELLO", ...args)".
   */
  // TODO(burdon): Implement tests.
  mapFormulaToNative(formula: string): string {
    return (
      formula
        // Sheet references.
        // https://hyperformula.handsontable.com/guide/cell-references.html#cell-references
        .replace(/['"]?([ \w]+)['"]?!/, (_match, name) => {
          if (name) {
            // TODO(burdon): What if not loaded?
            const objects = this._graph.hf
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
}
