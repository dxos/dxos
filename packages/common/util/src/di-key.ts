//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { defaultMap } from './map';

const symbolSingleton = Symbol('singleton');

export class SymbolDiKey<T> {
  symbol: symbol;

  constructor(name: string) {
    this.symbol = Symbol(name);
  }

  public [symbolSingleton]?: () => T = undefined;

  toString() {
    return String(this.symbol).slice(7, -1);
  }

  [inspect.custom]() {
    return this.toString();
  }
}

// TODO(dmaretskyi): Default values.
// TODO(dmaretskyi): Collections.
export type DiKey<T> = { new (...args: any[]): T } | SymbolDiKey<T>;

export const DiKey = new (class DiKeyConstructor {
  // TODO(dmaretskyi): Disable private members lowering for dev env.
  // TODO(dmaretskyi): Could be a weak map after a NodeJS upgrade.
  #combinedRegistry = new Map();

  define<T>(name: string): DiKey<T> {
    return Symbol(name) as any;
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

  combine(...ids: DiKey<any>[]) {
    const map = this.#lookupCombined(this.#combinedRegistry, ids);
    return defaultMap(this.#combinedRegistry, map, () => this.#combinedDescription(ids));
  }

  getSingletonFactory<T>(id: DiKey<T>): (() => T) | undefined {
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

// class Di {
//   #definitions = new Map<DiKey<any>, any>()

//   set<T>(id: DiKey<T>, value: T | ((di: this) => T)): this {
//     if(this.#definitions.has(id)) {
//       throw new Error()
//     }

//     this.#definitions.set(id, value);

//     return this;
//   }

//   get<T>(id: DiKey<T>): T {

//   }
// }
