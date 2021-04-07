/**
 * Immediatelly throws an error passed as an argument.
 *
 * Usefull for throwing errors from inside expressions.
 * For example:
 * ```
 * const item = model.getById(someId) ?? raise(new Error('Not found'));
 * ```
 * @param error
 */
export declare const raise: (error: Error) => never;
//# sourceMappingURL=raise.d.ts.map