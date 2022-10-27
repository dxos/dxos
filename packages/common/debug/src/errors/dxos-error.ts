//
// Copyright 2021 DXOS.org
//

/**
 * Error class to be used in the public API.
 *
 * @param code Error code should be formatted in SCREAMING_SNAKE_CASE. Must be prefixed with 'DXOS_.
 */
export class DXOSError extends Error {
  constructor(readonly code: string, readonly dxosErrorMessage?: string) {
    super(dxosErrorMessage ? `${code}: ${dxosErrorMessage}` : code.toString());
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error class to be used in the public API. These erros can be displayed to users in the UI.
 *
 * @param code Error code should be formatted in SCREAMING_SNAKE_CASE. Must be prefixed with 'DXOS_.
 * @param dxosErrorMessage Error message containing error details.
 * @param userErrorMessage Minimal error message that can be displayed as-is in the UI.
 */
export class DXOSUserError extends DXOSError {
  constructor(code: string, dxosErrorMessage?: string, readonly userErrorMessage = dxosErrorMessage) {
    super(code, dxosErrorMessage);
  }
}
