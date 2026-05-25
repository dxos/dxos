//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Annotation carrying a `FormLayout` DSL template that controls how `Form.FieldSet`
 * arranges a schema's fields. When present, the template wins over linear rendering.
 *
 * Templates use a minimal XML grammar — see `parser.ts`. Example:
 *
 *   FormLayoutAnnotation.set(`
 *     <grid cols="2">
 *       <field name="origin"/>
 *       <field name="destination"/>
 *       <field name="provider" span="2"/>
 *     </grid>
 *   `)
 */
export const FormLayoutAnnotationId = Symbol.for('@dxos/react-ui-form/annotation/Layout');

export const FormLayoutAnnotation = createAnnotationHelper<string>(FormLayoutAnnotationId);
