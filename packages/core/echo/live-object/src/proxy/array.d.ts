/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 */
export declare class ReactiveArray<T> extends Array<T> {
    static get [Symbol.species](): ArrayConstructor;
}
//# sourceMappingURL=array.d.ts.map