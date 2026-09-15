//
// Copyright 2022 DXOS.org
//

// NOTE: The `util` module depends on process global.
import './globals.js';
import deepEqual from 'deep-equal';
import util from 'util/';

export { callbackify, debuglog, format, inspect, promisify, stripVTControlCharacters } from 'util/';

// The `util/` polyfill omits this one; `deep-equal` in strict mode is the `deepStrictEqual`
// comparison Node's version performs.
export const isDeepStrictEqual = (actual, expected) => deepEqual(actual, expected, { strict: true });

export default util;
