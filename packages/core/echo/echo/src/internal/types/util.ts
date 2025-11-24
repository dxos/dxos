//
// Copyright 2024 DXOS.org
//

import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { getDeep, setDeep } from '@dxos/util';

import { type WithMeta } from './base';
import { ATTR_META, type ObjectMeta } from './meta';

// TODO(burdon): Move to `@dxos/util`.
export const getValue = <T extends object>(obj: T, path: JsonPath): any => {
  return getDeep(
    obj,
    splitJsonPath(path).map((p) => p.replace(/[[\]]/g, '')),
  );
};

// TODO(burdon): Move to `@dxos/util`.
export const setValue = <T extends object>(obj: T, path: JsonPath, value: any): T => {
  return setDeep(
    obj,
    splitJsonPath(path).map((p) => p.replace(/[[\]]/g, '')),
    value,
  );
};

/**
 * Utility to split meta property from raw object.
 * @deprecated Bad API.
 */
export const splitMeta = <T>(object: T & WithMeta): { object: T; meta?: ObjectMeta } => {
  const meta = object[ATTR_META];
  delete object[ATTR_META];
  return { meta, object };
};
