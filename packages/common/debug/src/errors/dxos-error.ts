/**
 * Error class to be used in the public API.
 * 
 * @param code Error code should be formatted in SCREAMING_SNAKE_CASE.
 */
export class DXOSError extends Error {
  constructor(
    readonly code: string,
    readonly dxosErrorMessage?: string,
  ) {
    super(dxosErrorMessage ? `${code}: ${dxosErrorMessage}` : code.toString());
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain. https://stackoverflow.com/a/48342359
  }  
}
