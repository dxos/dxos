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

// Assigned onto the polyfill rather than spread into a new object: `export default` has to keep the
// polyfill's identity and its non-enumerable members, and this is the one member the named exports
// above provide that `util/` itself does not.
export default Object.assign(util, { isDeepStrictEqual });
