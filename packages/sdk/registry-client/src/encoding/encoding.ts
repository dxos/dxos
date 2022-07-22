//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import type { IConversionOptions, Type } from 'protobufjs';

import { FieldMapper, mapMessage } from '@dxos/codec-protobuf';

import { CID, RegistryType } from '../api';
import { Record, TYPES } from '../proto';

const getProtoTypeFromTypeRecord = (record: RegistryType): Type =>
  record.type.protobufDefs.lookupType(record.type.messageName);

export type RecordExtension<T> = { '@type': CID } & Pick<T, Exclude<keyof T, '@type'>>

const OBJECT_CONVERSION_OPTIONS: IConversionOptions = {
  // Represent long integers as strings.
  longs: String,

  // Will set empty repeated fields to [] instead of undefined.
  // TODO(marik-d): Type repeated fields as non-optional arrays.
  arrays: true
};

const RECORD_EXTENSION_NAME: keyof TYPES = 'dxos.registry.Record.Extension';

export const decodeExtensionPayload = async (
  extension: Record.Extension,
  resolveType: (cid: CID) => Promise<RegistryType>
): Promise<RecordExtension<any>> => {
  const mapper: FieldMapper = async (value, typeName) => {
    if (typeName !== RECORD_EXTENSION_NAME) {
      return value;
    }

    const extension = value as Record.Extension;
    assert(extension.typeRecord);
    assert(extension.data);

    const typeCid = CID.from(extension.typeRecord);
    const typeRecord = await resolveType(typeCid);

    const dataType = getProtoTypeFromTypeRecord(typeRecord);
    const dataJson = dataType.toObject(
      dataType.decode(Buffer.from(extension.data)),
      OBJECT_CONVERSION_OPTIONS
    );
    return { '@type': typeCid, ...(await mapMessage(dataType, mapper, dataJson)) };
  };
  return mapper(extension, RECORD_EXTENSION_NAME);
};

export const encodeExtensionPayload = async (
  data: RecordExtension<any>,
  resolveType: (cid: CID) => Promise<RegistryType>
): Promise<Record.Extension> => {
  const mapper: FieldMapper = async (value, typeName) => {
    if (typeName !== RECORD_EXTENSION_NAME) {
      return value;
    }

    const { '@type': typeCid, ...extension } = value as RecordExtension<any>;
    const typeRecord = await resolveType(typeCid);

    const dataType = getProtoTypeFromTypeRecord(typeRecord);
    const recursiveMap = await mapMessage(dataType, mapper, extension);
    const payload = dataType.encode(recursiveMap).finish();
    return {
      data: payload,
      typeRecord: typeCid.value
    };
  };

  return mapper(data, RECORD_EXTENSION_NAME);
};

export const sanitizeExtensionData = (
  data: unknown,
  expectedType: CID
): RecordExtension<any> => {
  assert(typeof data === 'object' && data !== null);
  if (!('@type' in data)) {
    return { '@type': expectedType, ...data };
  } else {
    assert(data['@type'] instanceof CID);
    assert(expectedType.equals(data['@type']));
    return data as RecordExtension<any>;
  }
};
