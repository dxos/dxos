//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/document-model';

import { type ObjectMeta, type EchoObject } from '../object';
import { type Schema } from '../proto';

export interface DocStructure {
  objects: {
    [key: string]: ObjectStructure;
  };
}

/**
 * Representation of an ECHO object in an AM document.
 */
export type ObjectStructure = {
  data: Record<string, any>;
  meta: ObjectMeta;
  system: ObjectSystem;
};

/**
 * Automerge object system properties.
 * (Is automerge specific.)
 */
export type ObjectSystem = {
  /**
   * Deletion marker.
   */
  deleted?: boolean;

  /**
   * Object type. Reference to the schema.
   */
  // TODO(mykola): It is not used right now.
  schema?: Schema;

  /**
   * Object reference ('protobuf' protocol) type.
   */
  type?: Reference;
};

export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReferenceObject = {
  '@type': typeof REFERENCE_TYPE_TAG;
  itemId: string | null;
  protocol: string | null;
  host: string | null;
};

export const encodeReference = (reference: Reference): EncodedReferenceObject => ({
  '@type': REFERENCE_TYPE_TAG,
  // NOTE: Automerge do not support undefined values, so we need to use null instead.
  itemId: reference.itemId ?? null,
  protocol: reference.protocol ?? null,
  host: reference.host ?? null,
});

export const decodeReference = (value: any) =>
  new Reference(value.itemId, value.protocol ?? undefined, value.host ?? undefined);

export const isEncodedReferenceObject = (value: any): value is EncodedReferenceObject =>
  typeof value === 'object' && value !== null && value['@type'] === REFERENCE_TYPE_TAG;

export type DecodedAutomergeValue =
  | undefined
  | string
  | number
  | boolean
  | DecodedAutomergeValue[]
  | { [key: string]: DecodedAutomergeValue }
  | Reference // TODO(dmaretskyi): Raw references shouldn't be here.
  | EchoObject;
