//
// Copyright 2022 DXOS.org
//

import pify from 'pify';

/**
 * A nicer, more readable pify.
 */
export const py = (obj: any, fn: Function) => pify(fn).bind(obj);
