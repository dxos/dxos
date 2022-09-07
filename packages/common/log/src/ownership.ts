//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

const kOwnershipScope = Symbol('kOwnershipScope');
const kCurrentOwnershipScope = Symbol('kCurrentOwnershipScope');
const kDebugInfoProperties = Symbol('kDebugInfoProperties');

export class OwnershipScope {
  public instance: any;

  constructor (
    public constr: any,
    public parent?: OwnershipScope
  ) {}

  getInfo () {
    if (!this.instance) {
      return {};
    }
    const props = this.constr.prototype[kDebugInfoProperties] ?? [];
    const info: any = {};
    for (const prop of props) {
      info[prop] = this.instance[prop];
    }
    return info;
  }

  [inspect.custom] () {
    return {
      className: this.constr.name,
      info: this.getInfo(),
      parent: this.parent
    };
  }
}

function decorateMethodWeakReturnOwnership (prototype: any, key: string) {
  const original = prototype[key];
  prototype[key] = function (...args: any) {
    const res = original.apply(this, ...args);

    if (res && typeof res.then === 'function') {
      res.then((value: any) => {
        if (kOwnershipScope in value) {
          value[kOwnershipScope].parent ??= this[kOwnershipScope];
        }
      });
    } else {
      if (res && kOwnershipScope in res) {
        res[kOwnershipScope].parent ??= this[kOwnershipScope];
      }
    }

    return res;
  };

}

export function ownershipClass<T extends {new (...args: any[]): {}}>(constr: T) {
  for (const key of Object.getOwnPropertyNames(constr.prototype)) {
    if (key !== 'constructor' && typeof constr.prototype[key] === 'function') {
      decorateMethodWeakReturnOwnership(constr.prototype, key);
    }
  }

  return class extends constr {
    constructor (...args: any[]) {
      const currentCausality = (globalThis as any)[kCurrentOwnershipScope];
      (globalThis as any)[kCurrentOwnershipScope] = new OwnershipScope(constr, currentCausality);
      super(...args);
      (this as any)[kOwnershipScope] = (globalThis as any)[kCurrentOwnershipScope];
      (this as any)[kOwnershipScope].instance = this;
      (globalThis as any)[kCurrentOwnershipScope] = currentCausality;
    }
  };
}

export const debugInfo = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  // console.log(target, propertyKey, descriptor);
  (target[kDebugInfoProperties] ??= []).push(propertyKey);
};

export const getCurrentOwnershipScope = (thisRef: any) => undefined;
