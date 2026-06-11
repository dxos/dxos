//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Annotation carrying one or more named `FormLayout` DSL templates that
 * control how `Form.FieldSet` / `Form.Layout` arrange a schema's fields.
 * Callers select a variant via the `name` prop; the implicit name is
 * `DEFAULT_LAYOUT_NAME` (`'default'`).
 *
 * Templates use a minimal XML grammar — see `parser.ts`. Example:
 *
 *   FormLayoutAnnotation.set({
 *     default: `
 *       <grid cols="2">
 *         <field name="origin"/>
 *         <field name="destination"/>
 *         <field name="provider" span="2"/>
 *       </grid>
 *     `,
 *     card: `
 *       <grid cols="1">
 *         <field name="provider"/>
 *         <field name="number"/>
 *       </grid>
 *     `,
 *   })
 */
export const FormLayoutAnnotationId = Symbol.for('@dxos/react-ui-form/annotation/Layout');

export type FormLayoutMap = Record<string, string>;

export const FormLayoutAnnotation = createAnnotationHelper<FormLayoutMap>(FormLayoutAnnotationId);

/** Name used when no explicit variant is requested. */
export const DEFAULT_LAYOUT_NAME = 'default';
