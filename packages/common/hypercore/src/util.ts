//
// Copyright 2022 DXOS.org
//

import { promisify } from 'node:util';

export const py = (obj: any, fn: Function) => promisify(fn.bind(obj));
