//
// Copyright 2024 DXOS.org
//

/**
 * Using this allows code to be written in a portable fashion, so that the custom inspect function is used in an Node.js environment and ignored in the browser.
 */
export const inspectCustom = Symbol.for('nodejs.util.inspect.custom');
