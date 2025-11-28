//
// Copyright 2020 DXOS.org
//

export type AsyncCallback<T> = (param: T) => Promise<void>;

export type Provider<T, V = void> = (arg: V) => T;

export type MaybeProvider<T, V = void> = T | ((arg: V) => T);

export type MaybePromise<T> = T | Promise<T>;

export type GuardedType<T> = T extends (value: any) => value is infer R ? R : never;

export type ToMutable<T> = T extends object
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

export type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, any>
    ? DeepReadonly<T[P]>
    : T[P] extends Array<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : T[P];
};

export type DeepWriteable<T> = { -readonly [K in keyof T]: T[K] extends object ? DeepWriteable<T[K]> : T[K] };

/**
 * Simplifies type (copied from effect).
 */
export type Simplify<A> = { [K in keyof A]: A[K] } extends infer B ? B : never;

/**
 * Replace types of specified keys.
 */
export type Specialize<T, U> = Simplify<Omit<T, keyof U> & U>;

/**
 * Make specified keys optional.
 */
// TODO(burdon): Wrapping with Simplify fails.
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * All types that evaluate to false when cast to a boolean.
 */
export type Falsy = false | 0 | '' | null | undefined;

/**
 * Use with filter chaining instead of filter(Boolean) to preserve type.
 * NOTE: To filter by type:
 * items.filter((item: any): item is RangeSet<Decoration> => item instanceof RangeSet)
 */
export const isTruthy = <T>(value: T): value is Exclude<T, Falsy> => !!value;
export const isNonNullable = <T>(value: T | null | undefined): value is T => value != null;

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
export const stripUndefined = <T extends { [index: string]: any }>(obj: T): T => {
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value === undefined) {
        delete obj[key];
      } else if (value !== null && typeof value === 'object') {
        stripUndefined(value); // TODO(burdon): Test recursion.
      }
    });
  }

  return obj;
};

/**
 * Return new object with sorted keys.
 */
export const sortKeys = <T extends object>(obj: T): T =>
  Object.keys(obj)
    .sort()
    .reduce<T>((sorted, key) => {
      (sorted as any)[key] = (obj as any)[key];
      return sorted;
    }, {} as T);

/**
 * Swap position of element within array.
 */
export const arrayMove = <T>(array: T[], from: number, to: number): Array<T> => {
  array.splice(to < 0 ? array.length + to : to, 0, array.splice(from, 1)[0]);
  return array;
};
