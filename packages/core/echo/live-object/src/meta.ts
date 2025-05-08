//
// Copyright 2025 DXOS.org
//

import { type ObjectMeta } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

// TODO(dmaretskyi): Move to echo-schema.

export const symbolMeta = Symbol.for('@dxos/schema/ObjectMeta');

/**
 * Get metadata from object.
 * @internal
 */
// TODO(dmaretskyi): Combine with `getMeta`
export const getObjectMeta = (object: any): ObjectMeta => {
  const metadata = object[symbolMeta];
  invariant(metadata, 'ObjectMeta not found.');
  return metadata;
};
