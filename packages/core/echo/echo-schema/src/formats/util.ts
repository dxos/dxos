//
// Copyright 2024 DXOS.org
//

import { type S } from '@dxos/effect';

/**
 * Conditionally apply transformation.
 * @param schema
 * @param condition
 * @param transformation
 */
export const conditionalPipe = <T>(
  schema: S.Schema<T>,
  condition: boolean,
  transformation: (s: S.Schema<T>) => S.Schema<T>,
): S.Schema<T> => (condition ? transformation(schema) : schema);
