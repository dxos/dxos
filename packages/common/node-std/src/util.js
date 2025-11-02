//
// Copyright 2022 DXOS.org
//

// NOTE: The `util` module depends on process global.
import './globals';
import util from 'util/';

export { callbackify, debuglog, format, inspect, promisify, stripVTControlCharacters } from 'util/';
export default util;
