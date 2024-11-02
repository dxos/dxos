//
// Copyright 2024 DXOS.org
//

import {
  AST,
  deleteProperty,
  type JsonPath,
  getAnnotation,
  setAnnotation,
  type StoredSchema,
  type JsonSchemaType,
  composeSchema,
} from '@dxos/echo-schema';

import { type FieldType, type FieldPropertiesType, type ViewType } from './view';
import type { JsonSchema7, JsonSchema7Object } from '@effect/schema/JSONSchema';

/**
 * Maps view fields and schema annotations onto in-memory projections used by UX components.
 */
export class FieldProjection {
  constructor(private readonly _annotationIds: symbol[] = [AST.TitleAnnotationId, AST.DescriptionAnnotationId]) {}

  /**
   * Gets combined information about a property: combined schema from the object type and view projection schema + field info.
   */
  getFieldProperties(objectType: StoredSchema, view: ViewType, property: string): [FieldType, JsonSchemaType] {
    const field = view.fields.find((f) => f.property === property) ?? { property };

    const composedSchema = composeSchema(objectType.jsonSchema as any, view.schema as any);

    const propertySchema = (composedSchema as JsonSchema7Object).properties[property];
    if (!propertySchema) {
      throw new Error(`Property not found: ${property}`);
    }

    return [field, propertySchema as JsonSchemaType];
  }

  /**
   * Updates field info only.
   * Does not mutate the schema.
   */
  // TODO(burdon): Re-order.
  setFieldProperties(view: ViewType, field: FieldType) {
    const current = view.fields.find((f) => f.property === field.property);
    if (!current) {
      view.fields.push(field);
    } else {
      Object.assign(current, field);
    }
  }

  /**
   * Updates the field info and the property schema.
   */
  setPropertySchema(objectType: StoredSchema, view: ViewType, field: FieldType, propertySchema: JsonSchemaType) {
    const current = view.fields.find((f) => f.property === field.property);
    if (!current) {
      view.fields.push(field);
    } else {
      Object.assign(current, field);
    }

    // TODO(dmaretskyi): Currently we update both the view and type schema but in the future we only want to update the relevant parts.
    (objectType.jsonSchema as JsonSchema7Object).properties[field.property] = propertySchema;
    (view.schema as JsonSchema7Object).properties[field.property] = propertySchema;
  }

  /**
   * Deletes the field and the schema property (on both the view and the object type).
   */
  deleteField(objectType: StoredSchema, view: ViewType, field: FieldType) {
    const idx = view.fields.findIndex((f) => f.property === field.property);
    if (idx !== -1) {
      view.fields.splice(idx, 1);
      deleteProperty(objectType.jsonSchema as any, field.property);
      deleteProperty(view.schema as any, field.property);
    }
  }
}
