/**
 * Map with lazily created values.
 */
export declare class LazyMap<K, V> extends Map<K, V> {
    private _initFn;
    constructor(_initFn: (key: K) => V);
    getOrInit(key: K): V;
}
//# sourceMappingURL=map.d.ts.map