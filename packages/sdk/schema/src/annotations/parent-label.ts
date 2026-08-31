//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/**
 * When set on a Type.Ref field, instructs the form to display the parent object's label
 * instead of the referenced object's own label.
 */
export const ParentLabelAnnotationId = '@dxos/schema/annotation/ParentLabel';
export const ParentLabelAnnotation = Annotation.make({
  id: ParentLabelAnnotationId,
  schema: Schema.Boolean,
  legacyId: true,
});
