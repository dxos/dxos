//
// Copyright 2024 DXOS.org
//

import { type TypedObjectSerializer, jsonSerializer } from './default';
import { serializer as document } from './document';
import { serializer as sketch } from './sketch';
import { DocumentType, SketchType } from '../../schema';

export const serializers: Record<string, TypedObjectSerializer> = {
  [DocumentType.typename]: document,
  [SketchType.typename]: sketch,
  default: jsonSerializer,
};
