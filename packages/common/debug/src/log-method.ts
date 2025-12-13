//
// Copyright 2021 DXOS.org
//

/* eslint-disable no-console */

export function logMethod(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<(...args: any) => any>,
): void {
  const method = descriptor.value!;
  descriptor.value = function (this: any, ...args: any) {
    console.log(`Called ${target.constructor.name}.${propertyName} ${args}`);
    try {
      const result = method.apply(this, args);
      if (typeof result.catch === 'function') {
        result.catch((err: any) => {
          console.log(`Rejected ${target.constructor.name}.${propertyName}`, err);
        });
      }
      return result;
    } catch (err: any) {
      console.log(`Thrown ${target.constructor.name}.${propertyName}`, err);
      throw err;
    }
  };
}
