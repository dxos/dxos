//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * When set on a Type.Ref field, instructs the form to display the parent object's label
 * instead of the referenced object's own label.
 */
export const ParentLabelAnnotationId = Symbol.for('@dxos/schema/annotation/ParentLabel');
export const ParentLabelAnnotation = createAnnotationHelper<boolean>(ParentLabelAnnotationId);
