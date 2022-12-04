//
// Copyright 2022 DXOS.org
//

import util from 'node:util';

export const py = (obj: any, fn: Function) => util.promisify(fn.bind(obj));
