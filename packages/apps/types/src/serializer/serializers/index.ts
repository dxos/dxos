//
// Copyright 2024 DXOS.org
//

import { jsonSerializer, type TypedObjectSerializer } from './default';
import { serializer as document } from './document';
import { serializer as sketch } from './sketch';
import { DiagramType, DocumentType } from '../../schema';

export const serializers: Record<string, TypedObjectSerializer> = {
  [DocumentType.typename]: document,
  [DiagramType.typename]: sketch,
  default: jsonSerializer,
};
