//
// Copyright 2022 DXOS.org
//

const logInfoProperties = Symbol('logInfoProperties');
const logParent = Symbol('logParent');

/**
 * Decorate fields, properties, or methods to automatically include their values in log messages.
 *
 * Example:
 *
 * ```typescript
 * class Example {
 *   @logInfo
 *   peerId: PublicKey;
 * }
 * ```
 */
export const logInfo = (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
  // console.log(target, propertyKey, descriptor);
  (target[logInfoProperties] ??= []).push(propertyKey);
};

/**
 * Introspects class instance to find decorated metadata.
 * @param scope Class instance.
 */
export const gatherLogInfoFromScope = (scope: any): Record<string, any> => {
  if (!scope) {
    return {};
  }

  const res: Record<string, any> = {};
  const visited = new Set();

  const gatherProps = (scope: any) => {
    if (visited.has(scope)) {
      return;
    }
    visited.add(scope);

    const prototype = Object.getPrototypeOf(scope);
    const className = prototype.constructor?.name ?? 'Scope';
    const infoProps = prototype[logInfoProperties] ?? [];
    res[className] ??= {};
    for (const prop of infoProps) {
      try {
        res[className][prop] = typeof scope[prop] === 'function' ? scope[prop]() : scope[prop];
      } catch (err: any) {
        res[className][prop] = err.message;
      }
    }

    if(scope[logParent]) {
      gatherProps(scope[logParent]);
    }
  }

  gatherProps(scope);

  return res;
};

/**
 * Sets the parent scope for a child scope.
 * Child will inherit all contextual info properties from the parent.
 */
export const setLogParent = (parent: any, child: any) => {
  child[logParent] = parent;
}