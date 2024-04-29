//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Fix import ordering.
import { type TypedObjectSerializer, jsonSerializer } from './default';
import { serializer as document } from './document';
import { serializer as thread } from './thread';
import { DocumentType, ThreadType } from '../../schema';

export const serializers: Record<string, TypedObjectSerializer> = {
  [DocumentType.typename]: document,
  [ThreadType.typename]: thread,
  default: jsonSerializer,
};
