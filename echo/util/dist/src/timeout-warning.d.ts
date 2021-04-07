/**
 * Prints a warning to console if the action takes longer then specified timeout. No errors are thrown.
 *
 * @param timeout Timeout in milliseconds after which warning is printed.
 * @param context Context description that would be included in the printed message.
 * @param body Action which is timed.
 */
export declare function warnAfterTimeout<T>(timeout: number, context: string, body: () => Promise<T>): Promise<T>;
/**
 * A decorator that prints a warning to console if method execution time exceeds specified timeout.
 *
 * ```typescript
 * class Foo {
 *   @timed(5000)
 *   async doStuff() {
 *     // long task
 *   }
 * }
 * ```
 *
 * This is useful for debugging code that might deadlock.
 *
 * @param timeout Timeout in milliseconds after which the warning is printed.
 */
export declare function timed(timeout: number): (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any) => any>) => void;
//# sourceMappingURL=timeout-warning.d.ts.map