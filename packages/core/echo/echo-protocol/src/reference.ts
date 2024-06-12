//
// Copyright 2022 DXOS.org
//

import { type Reference as ReferenceValue } from '@dxos/protocols/proto/dxos/echo/model/document';
import { DXN, type SpaceId } from '@dxos/keys';

// TODO(burdon): Comment.
export class Reference {
  static fromValue(value: ReferenceValue): Reference {
    return new Reference(DXN.parse(value.dxn));
  }

  static forType(typename: string): Reference {
    return new Reference(new DXN(DXN.kind.TYPE, [typename]));
  }

  static forEchoObject(spaceId: SpaceId, objectId: string): Reference {
    return new Reference(new DXN(DXN.kind.ECHO, [spaceId, objectId]));
  }

  // prettier-ignore
  constructor(
    public readonly dxn: DXN,
  ) {}

  encode(): ReferenceValue {
    return { dxn: this.dxn.toString() };
  }
}

export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReferenceObject = {
  /**
   * Stringified DXN.
   */
  '/': string;
};

export const encodeReference = (reference: Reference): EncodedReferenceObject => ({ '/': reference.dxn.toString() });

export const decodeReference = (value: any) => new Reference(DXN.parse(value['/']));

export const isEncodedReferenceObject = (value: any): value is EncodedReferenceObject =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 1 &&
  '/' in value &&
  typeof value['/'] === 'string';
