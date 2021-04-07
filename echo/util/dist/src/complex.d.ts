export declare type Primitive = string | number | boolean | null | undefined;
export declare type PrimitiveProjection<T> = (value: T) => Primitive;
/**
 * A set implementation that can hold complex values (like Buffer).
 *
 * The user must provide a projection function which returns a primitive
 * representation of the complex value. This function must be 1-to-1 mapping.
 *
 * Look at `../complex.test.ts` for usage examples.
 */
export declare class ComplexSet<T> implements Set<T> {
    private readonly _projection;
    private readonly _values;
    constructor(_projection: PrimitiveProjection<T>, values?: Iterable<T> | null);
    add(value: T): this;
    clear(): void;
    delete(value: T): boolean;
    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;
    has(value: T): boolean;
    get size(): number;
    [Symbol.iterator](): IterableIterator<T>;
    entries(): IterableIterator<[T, T]>;
    keys(): IterableIterator<T>;
    values(): IterableIterator<T>;
    get [Symbol.toStringTag](): string;
}
export declare type ComplexSetConstructor<T> = new (values?: Iterable<T> | null) => ComplexSet<T>;
/**
 * Create a subclass of ComplexSet with predefined projection function.
 */
export declare const makeSet: <T>(projection: PrimitiveProjection<T>) => ComplexSetConstructor<T>;
/**
 * A map implementation that can hold complex values (like Buffer) as keys.
 *
 * The user must provide a projection function for map keys which returns a primitive
 * representation of the complex value. This function must be 1-to-1 mapping.
 *
 * Look at `../complex.test.ts` for usage examples.
 */
export declare class ComplexMap<K, V> implements Map<K, V> {
    private readonly _keyProjection;
    private readonly _keys;
    private readonly _values;
    constructor(_keyProjection: PrimitiveProjection<K>, entries?: readonly (readonly [K, V])[] | null);
    clear(): void;
    delete(key: K): boolean;
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): this;
    get size(): number;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    get [Symbol.toStringTag](): string;
}
export declare type ComplexMapConstructor<K> = new <V>(entries?: readonly (readonly [K, V])[] | null) => ComplexMap<K, V>;
/**
 * Create a subclass of ComplexMap with predefined key projection function.
 */
export declare const makeMap: <K>(keyProjection: PrimitiveProjection<K>) => ComplexMapConstructor<K>;
//# sourceMappingURL=complex.d.ts.map