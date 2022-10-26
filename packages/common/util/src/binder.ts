//
// Copyright 2022 DXOS.org
//

import util from 'node:util';

/**
 * Function binder replaces pify.
 */
// TODO(burdon): Replace pify everywhere.
export const createBinder = (obj: any) => ({
  fn: (fn: Function) => fn.bind(obj),
  async: (fn: Function) => util.promisify(fn.bind(obj))
});
