//
// Copyright 2020 DXOS.org
//

export const boolGuard = <T>(value: T | null | undefined): value is T => Boolean(value);

export type AsyncCallback<T> = (param: T) => Promise<void>;

export type Provider<T> = () => T;

export type MaybePromise<T> = T | Promise<T>;

export const isNotNullOrUndefined = <T>(x: T): x is Exclude<T, null | undefined> => x != null;

/**
 * All types that evaluate to false when cast to a boolean.
 */
export type Falsy = false | 0 | '' | null | undefined;

/**
 * A function returning a value or a value itself.
 */
export type MaybeFunction<T> = T | (() => T);

/**
 * Get value from a provider.
 */
export const getAsyncValue = async <T>(value: MaybeFunction<MaybePromise<T>>): Promise<T> => {
  if (typeof value === 'function') {
    return (value as Function)();
  } else {
    return value;
  }
};

export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> & Partial<Pick<Type, Key>>;

/**
 * Remove keys with undefined values.
 */
export const stripUndefinedValues = <T extends { [index: string]: any }>(obj: T): T => {
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value === undefined) {
        delete obj[key];
      } else if (value !== null && typeof value === 'object') {
        stripUndefinedValues(value); // TODO(burdon): Test recursion.
      }
    });
  }

  return obj;
};

/**
 * Swap position of element within array.
 */
export const arrayMove = <T>(array: Array<T>, from: number, to: number) => {
  return array.splice(to < 0 ? array.length + to : to, 0, array.splice(from, 1)[0]);
};
