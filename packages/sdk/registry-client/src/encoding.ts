//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import * as protobuf from 'protobufjs';

import 'protobufjs/ext/descriptor';
import { CID, RegistryTypeRecord } from '.';
import { FieldMapper, mapMessage } from './proto-mapper';
import { TYPES } from './proto/gen';
import { Record } from './proto/gen/dxos/registry';
import { FileDescriptorSet } from './proto/gen/google/protobuf';

// TODO(marik-d): Descriptors are unused right now, either fix them or remove those methods.

export function loadSchemaFromDescriptor (data: Uint8Array | FileDescriptorSet): protobuf.Root {
  return (protobuf.Root as any).fromDescriptor(preprocessSchemaDescriptor(data));
}

export function convertSchemaToDescriptor (root: protobuf.Root): FileDescriptorSet {
  return (root as any).toDescriptor('proto3');
}

/**
 * Message extensions seem to be both inlined in the target type, and included separatelly in the descriptor,
 * which causes an error when parsing the descriptor.
 *
 * This hack removes the extensions from the descriptor.
 */
function preprocessSchemaDescriptor (descriptor: any): any {
  if (typeof descriptor === 'object') {
    if (Array.isArray(descriptor.extension) && descriptor.extension[0]?.name === 'hashOptions') {
      descriptor.extension = [];
    } else {
      for (const key of Object.keys(descriptor)) {
        preprocessSchemaDescriptor(descriptor[key]);
      }
    }
  }
  return descriptor;
}

export function encodeProtobuf (root: protobuf.Root): string {
  return JSON.stringify(root.toJSON());
}

export function decodeProtobuf (json: string): protobuf.Root {
  return protobuf.Root.fromJSON(JSON.parse(json));
}

function getProtoTypeFromTypeRecord (record: RegistryTypeRecord): protobuf.Type {
  return record.protobufDefs.lookupType(record.messageName);
}

export type RecordExtension<T> = { '@type': CID } & Pick<T, Exclude<keyof T, '@type'>>

const OBJECT_CONVERSION_OPTIONS: protobuf.IConversionOptions = {
  // Represent long integers as strings.
  longs: String,

  // Will set empty repeated fields to [] instead of undefined.
  // TODO(marik-d): Type repeated fields as non-optional arrays.
  arrays: true
};

const RECORD_EXTENSION_NAME: keyof TYPES = 'dxos.registry.Record.Extension';

export async function decodeExtensionPayload (extension: Record.Extension, resolveType: (cid: CID) => Promise<RegistryTypeRecord>): Promise<RecordExtension<any>> {
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
    const dataJson = dataType.toObject(dataType.decode(Buffer.from(extension.data)), OBJECT_CONVERSION_OPTIONS);
    return {
      '@type': typeCid,
      ...(await mapMessage(dataType, mapper, dataJson))
    };
  };
  return mapper(extension, RECORD_EXTENSION_NAME);
}

export async function encodeExtensionPayload (data: RecordExtension<any>, resolveType: (cid: CID) => Promise<RegistryTypeRecord>): Promise<Record.Extension> {
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
}

export function sanitizeExtensionData (data: unknown, expectedType: CID): RecordExtension<any> {
  assert(typeof data === 'object' && data !== null);
  if (!('@type' in data)) {
    return {
      '@type': expectedType,
      ...data
    };
  } else {
    assert(data['@type'] instanceof CID);
    assert(expectedType.equals(data['@type']));
    return data as RecordExtension<any>;
  }
}
