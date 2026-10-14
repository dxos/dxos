//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

const kOwnershipScope = Symbol('kOwnershipScope');
const kDebugInfoProperties = Symbol('kDebugInfoProperties');

/** Scope of the instance currently under construction; the symbol key was module-private anyway. */
let currentOwnershipScope: OwnershipScope | undefined;

/** Objects carrying ownership scopes under symbol keys. */
type ScopeHost = {
  [kOwnershipScope]?: OwnershipScope;
};

/**
 *
 */
// TODO(burdon): Document.
export class OwnershipScope {
  public instance: any;

  constructor(
    public constr: any,
    public parent?: OwnershipScope,
  ) {}

  getInfo() {
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

  [inspect.custom]() {
    return {
      className: this.constr.name,
      info: this.getInfo(),
      parent: this.parent,
    };
  }
}

function decorateMethodWeakReturnOwnership(prototype: any, key: string) {
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

export function ownershipClass<T extends { new (...args: any[]): {} }>(constr: T) {
  for (const key of Object.getOwnPropertyNames(constr.prototype)) {
    if (key !== 'constructor' && typeof constr.prototype[key] === 'function') {
      decorateMethodWeakReturnOwnership(constr.prototype, key);
    }
  }

  return class extends constr {
    constructor(...args: any[]) {
      const currentCausality = currentOwnershipScope;
      const scope = new OwnershipScope(constr, currentCausality);
      currentOwnershipScope = scope;
      super(...args);
      const instanceHost: ScopeHost = this;
      instanceHost[kOwnershipScope] = scope;
      scope.instance = this;
      currentOwnershipScope = currentCausality;
    }
  };
}

export const debugInfo = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  // console.log(target, propertyKey, descriptor);
  (target[kDebugInfoProperties] ??= []).push(propertyKey);
};

export const getCurrentOwnershipScope = (thisRef: any) => thisRef;
