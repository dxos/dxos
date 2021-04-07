"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.timed = exports.warnAfterTimeout = void 0;
/**
 * Prints a warning to console if the action takes longer then specified timeout. No errors are thrown.
 *
 * @param timeout Timeout in milliseconds after which warning is printed.
 * @param context Context description that would be included in the printed message.
 * @param body Action which is timed.
 */
async function warnAfterTimeout(timeout, context, body) {
    const stackTrace = getStackTrace();
    const timeoutId = setTimeout(() => {
        console.warn(`Action \`${context}\` is taking more then ${timeout} ms to complete. This might be a bug.\n${stackTrace}`);
    }, timeout);
    try {
        return await body();
    }
    finally {
        clearTimeout(timeoutId);
    }
}
exports.warnAfterTimeout = warnAfterTimeout;
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
function timed(timeout) {
    return (target, propertyName, descriptor) => {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            return warnAfterTimeout(timeout, `${target.constructor.name}.${propertyName}`, () => method.apply(this, args));
        };
    };
}
exports.timed = timed;
function getStackTrace() {
    try {
        throw new Error();
    }
    catch (err) {
        return err.stack.split('\n').slice(1).join('\n');
    }
}
//# sourceMappingURL=timeout-warning.js.map