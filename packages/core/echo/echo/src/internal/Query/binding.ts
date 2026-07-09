//
// Copyright 2026 DXOS.org
//

const BindingTypeId = '~@dxos/echo/query/binding' as const;
type BindingTypeId = typeof BindingTypeId;

const symbolSegments = Symbol.for('@dxos/echo/query/binding/segments');
const symbolValue = Symbol.for('@dxos/echo/query/binding/value');

/**
 * A property path captured from a query closure (e.g. `_ => _.created`). `Segments` records the
 * accessed path so `Query.groupBy`/`Query.orderBy` can recover the original property names; `V` is
 * a phantom carrying the bound value's static type, so `Aggregate.max(_.created)` can infer its
 * result type directly from the path it was given, without a separate type parameter.
 */
export interface BindingPath<Segments extends readonly string[] = readonly string[], V = unknown> {
  readonly [BindingTypeId]: BindingTypeId;
  readonly [symbolSegments]: Segments;
  /** Phantom — never assigned; exists only so `V` is inferable from a `BindingPath` argument. */
  readonly [symbolValue]?: V;
  toString(): string;
}

/** True only when `T` is literally `any` (not merely wide) — the standard `0 extends 1 & T` idiom. */
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * A proxy shaped like `T`. Accessing a property records it and returns a {@link BindingPath}
 * carrying that property's name and static type.
 *
 * Only single-level access is typed for now — nested paths (`_.a.b`) are a deferred DSL extension;
 * the underlying proxy already accumulates the full segment chain (see {@link makeBinding}) so that
 * extension won't require a breaking change here.
 *
 * Collapses to plain `any` when `T` is `any`: a mapped type over `any` produces an index signature
 * (`keyof any` is `string | number | symbol`), which — unlike `any` itself — does not structurally
 * satisfy a `Binding<ConcreteType>` requiring specific literal-keyed properties. Since `Query<T>`
 * uses `Binding<T>` inside a callback *parameter*, that mismatch would otherwise make `Query<any>`
 * incompatible with `Query<ConcreteType>` and break every generic method built on `Query<any>`.
 */
export type Binding<T> =
  IsAny<T> extends true
    ? any
    : {
        readonly [K in keyof T & string]-?: BindingPath<readonly [K], T[K]>;
      } & BindingPath<readonly [], T>;

/** Checks whether `value` is a {@link BindingPath} captured from a `Binding` proxy. */
export const isBinding = (value: unknown): value is BindingPath =>
  typeof value === 'object' && value !== null && BindingTypeId in value;

/** The segments accessed to reach this path, e.g. `['created']` for `_.created`, `[]` for `_` itself. */
export const getSegments = (path: BindingPath): readonly string[] => path[symbolSegments];

/** Constructs a fresh binding proxy rooted at `segments` (`[]` for the query row itself). */
export const makeBinding = <T>(segments: readonly string[] = []): Binding<T> => {
  const target: BindingPath = {
    [BindingTypeId]: BindingTypeId,
    [symbolSegments]: segments,
    toString: () => segments.join('.'),
  };
  return new Proxy(target, {
    get: (target, prop) => {
      if (typeof prop === 'string' && !(prop in target)) {
        return makeBinding([...segments, prop]);
      }
      return Reflect.get(target, prop);
    },
    set: () => false,
  }) as Binding<T>;
};

/**
 * Extracts the single property name a captured {@link BindingPath} points at.
 * Throws if the path has zero or more than one segment — nested paths (`_.a.b`) are deferred.
 */
export const propertyOf = (path: BindingPath): string => {
  if (!isBinding(path)) {
    throw new TypeError('Expected a query binding (e.g. `_.foo`), got a plain value.');
  }
  const segments = getSegments(path);
  if (segments.length !== 1) {
    throw new TypeError(
      `Expected a single property access (e.g. \`_ => _.foo\`); nested paths are not yet supported. Got: ${
        segments.join('.') || '<root>'
      }`,
    );
  }
  return segments[0];
};

/** Invokes `fn` with a fresh binding over `T` and returns the single property it accessed. */
export const captureProperty = <T>(fn: (_: Binding<T>) => BindingPath): string => propertyOf(fn(makeBinding<T>()));
