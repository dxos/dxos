//
// Copyright 2022 DXOS.org
//

const logInfoProperties = Symbol('logInfoProperties');

export const logInfo = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  // console.log(target, propertyKey, descriptor);
  (target[logInfoProperties] ??= []).push(propertyKey);
};

export const gatherLogInfoFromScope = (scope: any): Record<string, any> => {
  const res: Record<string, any> = {};

  const prototype = Object.getPrototypeOf(scope);
  const infoProps = prototype[logInfoProperties] ?? [];
  for (const prop of infoProps) {
    if (typeof scope[prop] === 'function') {
      try {
        res[prop] = scope[prop]();
      } catch (err: any) {
        res[prop] = err.message;
      }
    } else {
      res[prop] = scope[prop];
    }
  }

  return res;
};
