//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { getTypeReference } from '../internal';

// TODO(burdon): Factor out.
export type Intersection<Types extends readonly unknown[]> = Types extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;

/**
 * @param input schema or a typename string
 * @return type DXN
 */
export const getTypeDXNFromSpecifier = (input: Schema.Schema.All | string): DXN => {
  if (Schema.isSchema(input)) {
    return getTypeReference(input)?.toDXN() ?? raise(new TypeError('Schema has no DXN'));
  } else {
    assertArgument(typeof input === 'string', 'input');
    assertArgument(!input.startsWith('dxn:'), 'input');
    return DXN.fromTypename(input);
  }
};
