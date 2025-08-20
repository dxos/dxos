//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo-schema';

export const ItemAnnotationId = Symbol.for('@dxos/schema/annotation/Item');

export const ItemAnnotation = createAnnotationHelper<boolean>(ItemAnnotationId);
