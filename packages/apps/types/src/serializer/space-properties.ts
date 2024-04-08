//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

/**
 * Before effect schema echo objects were converting property accesses of form:
 * object['complex.key.part']
 * into
 * object['complex']['key']['part']
 * these functions are required for pre- and post- effect schema code full compatibility
 * when working with space properties.
 */

// TODO(burdon): Factor out.

export const getSpaceProperty = <T>(space: Space | undefined, key: string): T | undefined => {
  if (space == null) {
    return undefined;
  }
  const keySegments = toKeySegments(key);
  let result: any = space.properties;
  for (const keySegment of keySegments) {
    result = result?.[keySegment];
  }
  return result as T;
};

export const setSpaceProperty = (space: Space, key: string, value: any) => {
  const keySegments = toKeySegments(key);
  let valueContainer: any = space.properties;
  for (const keySegment of keySegments.slice(0, keySegments.length - 1)) {
    valueContainer[keySegment] ??= {};
    valueContainer = valueContainer[keySegment];
  }
  valueContainer[keySegments[keySegments.length - 1]] = value;
};

const toKeySegments = (key: string): string[] => {
  const keySegments = key.split('.');
  invariant(keySegments.length > 0);
  return keySegments;
};
