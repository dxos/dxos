//
// Copyright 2022 DXOS.org
//

const logInfoProperties = Symbol('logInfoProperties');

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
export const logInfo = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  // console.log(target, propertyKey, descriptor);
  (target[logInfoProperties] ??= []).push(propertyKey);
};

/**
 * Introspects class instance to find decorated metadata.
 * @param scope Class instance.
 */
export const gatherLogInfoFromScope = (scope: any): Record<string, any> => {
  if(!scope) {
    return {};
  }

  const res: Record<string, any> = {};

  const prototype = Object.getPrototypeOf(scope);
  const infoProps = prototype[logInfoProperties] ?? [];
  for (const prop of infoProps) {
    try {
      res[prop] = typeof scope[prop] === 'function' ? scope[prop]() : scope[prop];
    } catch (err: any) {
      res[prop] = err.message;
    }
  }

  return res;
};
