//
// Copyright 2020 DXOS.org
//

export type AsyncCallback<T> = (param: T) => Promise<void>;

export type Provider<T, V = void> = (arg: V) => T;

export type MaybeProvider<T, V = void> = T | ((arg: V) => T);

export type MaybePromise<T> = T | Promise<T>;

export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> & Partial<Pick<Type, Key>>;

/**
 * All types that evaluate to false when cast to a boolean.
 */
export type Falsy = false | 0 | '' | null | undefined;

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

// TODO(burdon): Replace use of setTimeout everywhere?
//  Would remove the need to cancel (and associated errors), but would change the operation of the code
//  since the function would call immediately instead of waiting for the next tick.
//  Could this affect performance? Otherwise replace with queueMicrotask?
export const doAsync = async (fn: () => Promise<void>) => fn();

/**
 * Get value from a provider.
 */
export const getProviderValue = <T, V = void>(provider: MaybeProvider<T, V>, arg?: V): T => {
  return typeof provider === 'function' ? (provider as Function)(arg) : provider;
};

/**
 * Get value from a provider, which may be async.
 */
export const getAsyncProviderValue = <T, V = void>(
  provider: MaybeProvider<MaybePromise<T>, V>,
  arg?: V,
): MaybePromise<T> => {
  return getProviderValue(provider, arg);
};

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
