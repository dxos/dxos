//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

/**
 * Used in forms to identify the field representing an object's type.
 */
export const TypenameAnnotationId = Symbol.for('@dxos/schema/annotation/Typename');

// TODO(wittjosiah): Review these values.
export const TypenameAnnotation = Schema.Literal('object-form', 'static', 'limited-static', 'unused-static', 'dynamic');
export type TypenameAnnotation = Schema.Schema.Type<typeof TypenameAnnotation>;
