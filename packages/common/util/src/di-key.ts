//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { defaultMap } from './map';

export const symbolSingleton = Symbol('singleton');

export type SingletonFactory<T> = () => T;

export class SymbolDiKey<T> {
  symbol: symbol;

  constructor(name: string) {
    this.symbol = Symbol(name);
  }

  public [symbolSingleton]?: SingletonFactory<T> = undefined;

  toString() {
    return String(this.symbol).slice(7, -1);
  }

  [inspect.custom]() {
    return this.toString();
  }
}

export type ConstructorDiKey<T> = {
  new (...args: any[]): T;

  [symbolSingleton]?: SingletonFactory<T>;
};

/**
 * Represents a key for an entry in a DI container.
 * Class constructors can be used as is.
 * Multiple keys can be combined into a single key to represent parameterized types.
 * Composite keys maintain referential equality.
 * Keys can optionally have a singleton factory attached to them.
 */
export type DiKey<T> =
  | {
      new (...args: any[]): T;
    }
  | SymbolDiKey<T>;

export const DiKey = new (class DiKeyConstructor {
  /**
   * Needed to ensure referential equality of combined keys.
   */
  // TODO(dmaretskyi): Disable private members lowering for dev env.
  // TODO(dmaretskyi): Could be a weak map after a NodeJS upgrade.
  #combinedRegistry = new Map();

  define<T>(name: string): DiKey<T> {
    return new SymbolDiKey(name);
  }

  singleton<T>(name: string, factory: () => T): DiKey<T> {
    const id = new SymbolDiKey(name);
    id[symbolSingleton] = factory;
    return id as any;
  }

  stringify(id: DiKey<any>): string {
    switch (typeof id) {
      case 'symbol':
        return String(id).slice(7, -1);
      case 'function':
        return id.name;
      default:
        return String(id);
    }
  }

  /**
   * Create composite keys to represent parameterized types.
   *
   * @example DiKey.combine(A, B, C) => "A<B, C>"
   *
   * Maintains referential equality: `DiKey.combine(A, B) === DiKey.combine(A, B)`
   */
  combine(...ids: DiKey<any>[]) {
    const map = this.#lookupCombined(this.#combinedRegistry, ids);
    return defaultMap(this.#combinedRegistry, map, () => this.#combinedDescription(ids));
  }

  getSingletonFactory<T>(id: DiKey<T>): SingletonFactory<T> | undefined {
    return (id as any)[symbolSingleton];
  }

  #lookupCombined(map: Map<any, any>, [first, ...rest]: DiKey<any>[]): Map<any, any> {
    const value = defaultMap(map, first, () => new Map());
    if (rest.length > 0) {
      return this.#lookupCombined(value, rest);
    } else {
      return value;
    }
  }

  #combinedDescription([first, ...rest]: DiKey<any>[]) {
    return `${this.stringify(first)}<${rest.map(this.stringify).join(', ')}>`;
  }
})();
