//
// Copyright 2020 DXOS.org
//

/**
 * Prints a warning to console if the action takes longer then specified timeout. No errors are thrown.
 *
 * @param timeout Timeout in milliseconds after which warning is printed.
 * @param context Context description that would be included in the printed message.
 * @param body Action which is timed.
 */
export async function warnAfterTimeout<T> (timeout: number, context: string, body: () => Promise<T>): Promise<T> {
  const stackTrace = getStackTrace();
  const timeoutId = setTimeout(() => {
    console.warn(`Action \`${context}\` is taking more then ${timeout} ms to complete. This might be a bug.\n${stackTrace}`);
  }, timeout);
  try {
    return await body();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function timed (timeout: number) {
  return (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: any) => any>
  ) => {
    const method = descriptor.value!;
    descriptor.value = function (this: any, ...args: any) {
      return warnAfterTimeout(timeout, `${target.constructor.name}.${propertyName}`, () => method.apply(this, args));
    };
  };
}

function getStackTrace () {
  try {
    throw new Error();
  } catch (err) {
    return err.stack.split('\n').slice(1).join('\n');
  }
}
