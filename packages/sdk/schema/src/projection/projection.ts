//
// Copyright 2025 DXOS.org
//

import { computed, untracked } from '@preact/signals-core';
import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';
import {
  type JsonProp,
  type JsonSchemaType,
  TypeEnum,
  formatToType,
  typeToFormat,
} from '@dxos/echo/internal';
import { createSchemaReference, getSchemaReference } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type Live, getSnapshot } from '@dxos/live-object';
import { log } from '@dxos/log';
import { omit, pick } from '@dxos/util';

import { type View } from '../types';
import { makeMultiSelectAnnotations, makeSingleSelectAnnotations } from '../util';

import { type FieldType, createFieldId } from './field';
import { PropertySchema, type PropertyType } from './format';

export const VIEW_FIELD_LIMIT = 32;

/**
 * Composite of view and schema metadata for a property.
 */
export type FieldProjection = {
  field: FieldType;
  props: PropertyType;
};

/**
 * Wrapper for Projection that manages Field and Format updates.
 */
export class ProjectionModel {
  private readonly _encode = Schema.encodeSync(PropertySchema);
  private readonly _decode = Schema.decodeSync(PropertySchema, {});

  private _visibleFields = computed(() => this._projection.fields.filter((field) => field.visible !== false));
  private _hiddenFields = computed(() => this._projection.fields.filter((field) => field.visible === false));
  private _fieldProjections = computed(() => this._projection.fields.map((field) => this.getFieldProjection(field.id)));
  private _hiddenProperties = computed(() => this._hiddenFields.value.map((field) => field.path as string) ?? []);

  // TOOD(burdon): Take an instance of S.S.AnyNoContext and derive the JsonSchemaType (and watch for reactivity)?
  constructor(
    // TODO(burdon): Pass in boolean readonly?
    private readonly _baseSchema: Live<JsonSchemaType>,
    private readonly _projection: Live<View.Projection>,
  ) {}

  /**
   * The base schema of the data being projected.
   */
  get baseSchema() {
    return this._baseSchema;
  }

  /**
   * The core projection data type.
   */
  get data(): Live<View.Projection> {
    return this._projection;
  }

  /**
   * The visible fields in the projection.
   * @reactive
   */
  get fields() {
    return this._visibleFields.value;
  }

  /**
   * The hidden fields in the projection.
   * @reactive
   */
  get hiddenFields() {
    return this._hiddenFields.value;
  }

  /**
   * All fields in the projection (both visible and hidden).
   * @reactive
   */
  get allFields() {
    return this._projection.fields;
  }

  /**
   * Construct a new property.
   */
  createFieldProjection(): FieldType {
    invariant(this._projection.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);

    const field: FieldType = {
      id: createFieldId(),
      path: createUniqueProperty(this._projection),
      visible: true,
    };

    log('createFieldProjection', { field });
    this._projection.fields.push(field);
    return field;
  }

  getFieldId(path: string): string | undefined {
    return this._projection.fields.find((field) => field.path === path)?.id;
  }

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  getFieldProjection(fieldId: string): FieldProjection {
    invariant(this._baseSchema.properties);
    const field = this._projection.fields.find((field) => field.id === fieldId);
    invariant(field, `invalid field: ${fieldId}`);
    invariant(field.path.indexOf('.') === -1);

    const jsonProperty: JsonSchemaType = this._baseSchema.properties[field.path] ?? { format: Format.TypeFormat.None };
    const { type: schemaType, format: schemaFormat = Format.TypeFormat.None, annotations, ...rest } = jsonProperty;

    const unwrappedProperty =
      'allOf' in jsonProperty && jsonProperty.allOf?.length ? jsonProperty.allOf[0] : jsonProperty;
    const { typename: referenceSchema } = getSchemaReference(unwrappedProperty) ?? {};
    const type = referenceSchema ? TypeEnum.Ref : (schemaType as TypeEnum);

    const format =
      (() => {
        if (referenceSchema) {
          return Format.TypeFormat.Ref;
        } else if (schemaFormat === Format.TypeFormat.None) {
          return typeToFormat[type];
        } else {
          return schemaFormat as Format.TypeFormat;
        }
      })() ?? Format.TypeFormat.None;

    const getOptions = () => {
      if (format === Format.TypeFormat.SingleSelect) {
        return annotations?.meta?.singleSelect?.options;
      }
      if (format === Format.TypeFormat.MultiSelect) {
        return annotations?.meta?.multiSelect?.options;
      }
    };

    const options = getOptions();

    const values: typeof PropertySchema.Type = {
      type,
      format,
      property: field.path as JsonProp,
      referenceSchema,
      referencePath: field.referencePath,
      options,
      ...rest,
    };

    const props = values.type ? this._decode(values) : values;
    log('getFieldProjection', { field, props });
    return { field, props };
  }

  /**
   * Get projection of View fields and JSON schema property annotations, returning undefined if field doesn't exist.
   * @param fieldId The ID of the field to get projection for
   */
  tryGetFieldProjection(fieldId: string): FieldProjection | undefined {
    invariant(this._baseSchema.properties);
    const field = this._projection.fields.find((field) => field.id === fieldId);
    if (!field) {
      return undefined;
    }

    return this.getFieldProjection(fieldId);
  }

  /**
   * Get all field projections
   * @reactive
   */
  getFieldProjections(): FieldProjection[] {
    return this._fieldProjections.value;
  }

  /**
   * Identifies schema properties not visible in the current view projection.
   * @returns Schema property names that aren't mapped to any view field path, returned as an alphabetically sorted string array.
   * @reactive
   */
  getHiddenProperties(): string[] {
    return this._hiddenProperties.value;
  }

  /**
   * Hides a field from the view by setting its visible flag to false.
   */
  hideFieldProjection(fieldId: string): void {
    untracked(() => {
      const field = this._projection.fields.find((field) => field.id === fieldId);
      if (field) {
        field.visible = false;
      }
    });
  }

  showFieldProjection(property: JsonProp): void {
    untracked(() => {
      invariant(this._baseSchema.properties);
      invariant(property in this._baseSchema.properties);

      const existingField = this._projection.fields.find((field) => field.path === property);
      if (existingField) {
        existingField.visible = true;
      } else {
        this._projection.fields.unshift({
          id: createFieldId(),
          path: property,
          visible: true,
        } satisfies FieldType);
      }
    });
  }

  /**
   * Update JSON schema property annotations and view fields.
   * @param projection The field and props to update
   * @param index Optional index for inserting new fields. Ignored when updating existing fields.
   */
  setFieldProjection({ field, props }: Partial<FieldProjection>, index?: number): void {
    log('setFieldProjection', { field, props, index });

    untracked(() => {
      const sourcePropertyName = field?.path;
      const targetPropertyName = props?.property;
      const hasSourceAndTarget = !!sourcePropertyName && !!targetPropertyName;
      const isRename = hasSourceAndTarget && sourcePropertyName !== targetPropertyName;

      if (targetPropertyName) {
        const existingField = this._projection.fields.find((field) => field.path === targetPropertyName);
        if (existingField && existingField.visible === false) {
          existingField.visible = true;
        }
      }

      // TODO(burdon): Set field if does not exist.
      if (field) {
        const propsValues = props ? (pick(props, ['referencePath']) as Partial<FieldType>) : undefined;
        const clonedField: FieldType = { ...field, ...propsValues };
        const fieldIndex = this._projection.fields.findIndex((field) => field.path === sourcePropertyName);
        if (fieldIndex === -1) {
          invariant(this._projection.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);
          if (index !== undefined && index >= 0 && index <= this._projection.fields.length) {
            this._projection.fields.splice(index, 0, clonedField);
          } else {
            this._projection.fields.push(clonedField);
          }
        } else {
          Object.assign(this.allFields[fieldIndex], clonedField, isRename ? { path: targetPropertyName } : undefined);
        }
      }

      if (props) {
        let { property, type, format, referenceSchema, options, ...rest }: Partial<PropertyType> = this._encode(
          omit(props, ['referencePath']),
        );
        invariant(property);
        invariant(format);

        const jsonProperty: JsonSchemaType = {};

        if (referenceSchema) {
          Object.assign(jsonProperty, createSchemaReference(referenceSchema));
          return;
        } else if (format) {
          type = formatToType[format];
        }

        if (options) {
          if (format === Format.TypeFormat.SingleSelect) {
            makeSingleSelectAnnotations(jsonProperty, options);
          }

          if (format === Format.TypeFormat.MultiSelect) {
            makeMultiSelectAnnotations(jsonProperty, options);
          }
        }

        invariant(type !== TypeEnum.Ref);
        this._baseSchema.properties ??= {};
        this._baseSchema.properties[property] = { type, format, ...jsonProperty, ...rest };
        if (isRename) {
          delete this._baseSchema.properties[sourcePropertyName!];

          // Update propertyOrder array if it exists
          if (this._baseSchema.propertyOrder) {
            const orderIndex = this._baseSchema.propertyOrder.indexOf(sourcePropertyName!);
            if (orderIndex !== -1) {
              this._baseSchema.propertyOrder[orderIndex] = property;
            }
          }

          // Update required array if it exists
          if (this._baseSchema.required) {
            const requiredIndex = this._baseSchema.required.indexOf(sourcePropertyName!);
            if (requiredIndex !== -1) {
              this._baseSchema.required[requiredIndex] = property;
            }
          }
        }
      }
    });
  }

  /**
   * Delete a field from the view and return the deleted projection for potential undo.
   */
  deleteFieldProjection(fieldId: string): { deleted: FieldProjection; index: number } {
    return untracked(() => {
      // NOTE(ZaymonFC): We need to clone this because the underlying object is going to be modified.
      const current = this.getFieldProjection(fieldId);
      invariant(current, `Field projection not found for fieldId: ${fieldId}`);

      const snapshot = getSnapshot(current);

      // Delete field.
      const fieldIndex = this._projection.fields.findIndex((field) => field.id === fieldId);
      if (fieldIndex !== -1) {
        this._projection.fields.splice(fieldIndex, 1);
      }

      // Delete property.
      invariant(this._baseSchema.properties, 'Schema properties must exist');
      invariant(snapshot.field.path, 'Field path must exist');
      delete this._baseSchema.properties[snapshot.field.path];

      // check that it's actually gone
      invariant(!this._baseSchema.properties[snapshot.field.path], 'Field path still exists');

      return { deleted: snapshot, index: fieldIndex };
    });
  }

  /**
   * Normalizes the view by:
   * 1. Removing fields that no longer exist in the schema
   * 2. Adding missing schema properties as hidden fields
   */
  normalizeView(): void {
    untracked(() => {
      // Get all properties from the schema.
      const schemaProperties = new Set(Object.keys(this._baseSchema.properties ?? {}));

      // 1. Remove fields that don't exist in schema anymore.
      for (let i = this._projection.fields.length - 1; i >= 0; i--) {
        const field = this.allFields[i];
        if (!schemaProperties.has(field.path)) {
          this._projection.fields.splice(i, 1);
        }
      }

      // 2. Find schema properties not represented in any field.
      const fieldPaths = new Set(this._projection.fields.map((field) => field.path));

      // 3. Add missing schema properties as hidden fields (excluding 'id').
      for (const prop of schemaProperties) {
        if (prop !== 'id' && !fieldPaths.has(prop as JsonProp)) {
          // Add new hidden field.
          this._projection.fields.push({
            id: createFieldId(),
            path: prop as JsonProp,
            visible: false,
          });
        }
      }
    });
  }
}

export const createUniqueProperty = (projection: View.Projection): JsonProp => {
  let n = 1;
  while (true) {
    const property: JsonProp = `prop_${n++}` as JsonProp;
    const idx = projection.fields.findIndex((field) => field.path === property);
    if (idx === -1) {
      return property;
    }
  }
};
