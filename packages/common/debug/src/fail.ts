/**
 * Should be used in expressions where values are cheked not to be null or undefined.
 * 
 * Example:
 * 
 * ```
 * const value: string | undefined;
 * 
 * callMethod(value ?? failUndefined());
 * ```
 */
export const failUndefined = () => {
    throw new Error('Required value was null or undefined.')
}