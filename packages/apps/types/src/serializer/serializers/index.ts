//
// Copyright 2024 DXOS.org
//

import { serializer as document } from './document';
import { serializer as sketch } from './sketch';
import { type TypedObjectSerializer } from './types';
import { DiagramType, DocumentType } from '../../schema';

/**
 * @deprecated only used to keep `cloneObject` working.
 */
export const serializers: Record<string, TypedObjectSerializer> = {
  [DocumentType.typename]: document,
  [DiagramType.typename]: sketch,
};
