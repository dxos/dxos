//
// Copyright 2025 DXOS.org
//

import { assertArgument } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { EntityKind } from '../types';

/**
 * @returns JSON-schema annotation so that the schema can be serialized with correct parameters.
 */
export const makeTypeJsonSchemaAnnotation = (options: {
  identifier?: string;
  kind: EntityKind;
  typename: string;
  version: string;
  relationSource?: string;
  relationTarget?: string;
}) => {
  assertArgument(!!options.relationSource === (options.kind === EntityKind.Relation), 'relationSource');
  assertArgument(!!options.relationTarget === (options.kind === EntityKind.Relation), 'relationTarget');

  const obj = {
    // TODO(dmaretskyi): Should this include the version?
    $id: options.identifier ?? DXN.fromTypename(options.typename).toString(),
    entityKind: options.kind,
    version: options.version,
    typename: options.typename,
  } as any;
  if (options.kind === EntityKind.Relation) {
    obj.relationSource = { $ref: options.relationSource };
    obj.relationTarget = { $ref: options.relationTarget };
  }

  return obj;
};
