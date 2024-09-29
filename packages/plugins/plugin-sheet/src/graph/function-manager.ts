//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Filter, type Space, fullyQualifiedId } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { FunctionType } from '@dxos/plugin-script/types';

import { defaultFunctions, type FunctionDefinition } from '../defs';
import type { ComputeGraph } from '../graph';

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

// TODO(burdon): Change to "DX".
const CUSTOM_FUNCTION = 'ECHO';

/**
 * Manages mapping between function bindings and their definitions.
 */
// TODO(burdon): Move into ComputeGraph.
export class FunctionManager {
  private readonly _ctx = new Context();

  private _functions: FunctionType[] = [];

  public readonly update = new Event();

  constructor(
    private readonly _graph: ComputeGraph,
    private readonly _space?: Space,
  ) {}

  async initialize() {
    if (this._space) {
      const query = this._space.db.query(Filter.schema(FunctionType));
      const unsubscribe = query.subscribe(({ objects }) => {
        this._functions = objects.filter(({ binding }) => binding);
        this.update.emit();
      });

      this._ctx.onDispose(unsubscribe);
    }
  }

  async destroy() {
    await this._ctx.dispose();
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
  mapFunctionBindingToCustomFunction(formula: string): string {
    return formula.replace(/([a-zA-Z0-9]+)\((.*)\)/g, (match, binding, args) => {
      const fn = this._functions.find((fn) => fn.binding === binding);
      if (!fn) {
        return match;
      }

      if (args.trim() === '') {
        return `${CUSTOM_FUNCTION}("${binding}")`;
      } else {
        return `${CUSTOM_FUNCTION}("${binding}", ${args})`;
      }
    });
  }

  /**
   * Map from binding to fully qualified ECHO ID (to store).
   * E.g., HELLO() => spaceId:objectId()
   */
  mapFunctionBindingToId(formula: string) {
    return formula.replace(/([a-zA-Z0-9]+)\((.*)\)/g, (match, binding, args) => {
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
    return formula.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)\((.*)\)/g, (match, spaceId, objectId, args) => {
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
