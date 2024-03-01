//
// Copyright 2020 DXOS.org
//

export type AsyncCallback<T> = (param: T) => Promise<void>;

export type Provider<T> = () => T;

export type MaybePromise<T> = T | Promise<T>;

/**
 * All types that evaluate to false when cast to a boolean.
 */
export type Falsy = false | 0 | '' | null | undefined;

/**
 * A function returning a value or a value itself.
 */
export type MaybeFunction<T> = T | (() => T);

/**
 * Use with filter chaining instead of filter(Boolean) to preserve type.
 * NOTE: To filter by type:
 * items.filter((item: any): item is RangeSet<Decoration> => item instanceof RangeSet)
 */
// TODO(burdon): Reconcile names and variants.
export const isNotFalsy = <T>(value: T): value is Exclude<T, Falsy> => !!value;
export const nonNullable = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined;
export const isNotNullOrUndefined = <T>(value: T): value is Exclude<T, null | undefined> => value != null;
// export const isNotNullish = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null;
export const boolGuard = <T>(value: T | null | undefined): value is T => Boolean(value);

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
export const arrayMove = <T>(array: T[], from: number, to: number): Array<T> => {
  array.splice(to < 0 ? array.length + to : to, 0, array.splice(from, 1)[0]);
  return array;
};

export const safeParseInt = (value: string | undefined, defaultValue?: number) => {
  try {
    const n = parseInt(value ?? '');
    return isNaN(n) ? defaultValue : n;
  } catch (err) {
    return defaultValue;
  }
};
