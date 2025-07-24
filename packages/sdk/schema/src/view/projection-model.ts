//
// Copyright 2025 DXOS.org
//

import { computed, untracked } from '@preact/signals-core';
import { Schema } from 'effect';

import {
  formatToType,
  typeToFormat,
  FormatEnum,
  type JsonProp,
  TypeEnum,
  type JsonSchemaType,
} from '@dxos/echo-schema';
import { getSchemaReference, createSchemaReference } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSnapshot, type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { omit, pick } from '@dxos/util';

import { type FieldType } from './field';
import { createFieldId, type Projection } from './view';
import { PropertySchema, type PropertyType } from '../format';
import { makeMultiSelectAnnotations, makeSingleSelectAnnotations } from '../util';

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

  private _fieldProjections = computed(() => this._projection.fields.map((field) => this.getFieldProjection(field.id)));
  private _hiddenProperties = computed(() => this._projection.hiddenFields?.map((field) => field.path as string) ?? []);

  // TOOD(burdon): Take an instance of S.S.AnyNoContext and derive the JsonSchemaType (and watch for reactivity)?
  constructor(
    // TODO(burdon): Pass in boolean readonly?
    private readonly _baseSchema: Live<JsonSchemaType>,
    private readonly _projection: Live<Projection>,
  ) {
    this.normalizeView();
    this.migrateSingleSelectStoredFormat();
  }

  /**
   * The base schema of the data being projected.
   */
  get baseSchema() {
    return this._baseSchema;
  }

  /**
   * The core projection data type.
   */
  get data(): Live<Projection> {
    return this._projection;
  }

  /**
   * The fields in the projection.
   * @reactive
   */
  get fields() {
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

    const jsonProperty: JsonSchemaType = this._baseSchema.properties[field.path] ?? { format: FormatEnum.None };
    const { type: schemaType, format: schemaFormat = FormatEnum.None, annotations, ...rest } = jsonProperty;

    const { typename: referenceSchema } = getSchemaReference(jsonProperty) ?? {};
    const type = referenceSchema ? TypeEnum.Ref : (schemaType as TypeEnum);

    const format =
      (() => {
        if (referenceSchema) {
          return FormatEnum.Ref;
        } else if (schemaFormat === FormatEnum.None) {
          return typeToFormat[type];
        } else {
          return schemaFormat as FormatEnum;
        }
      })() ?? FormatEnum.None;

    const getOptions = () => {
      if (format === FormatEnum.SingleSelect) {
        return annotations?.meta?.singleSelect?.options;
      }
      if (format === FormatEnum.MultiSelect) {
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
   * Hides a field from the view by moving it from visible fields to hiddenFields.
   * This preserves the field's structure and ID for later unhiding.
   */
  hideFieldProjection(fieldId: string): void {
    untracked(() => {
      const index = this._projection.fields.findIndex((field) => field.id === fieldId);
      if (index !== -1) {
        const fieldToHide = getSnapshot(this._projection.fields[index]);
        this._projection.fields.splice(index, 1);
        if (!this._projection.hiddenFields) {
          this._projection.hiddenFields = [];
        }

        this._projection.hiddenFields.push(fieldToHide);
      }
    });
  }

  showFieldProjection(property: JsonProp): void {
    untracked(() => {
      invariant(this._baseSchema.properties);
      invariant(property in this._baseSchema.properties);

      const existingField = this._projection.fields.find((field) => field.path === property);
      if (existingField) {
        return;
      }

      if (this._projection.hiddenFields) {
        const hiddenIndex = this._projection.hiddenFields.findIndex((field) => field.path === property);

        if (hiddenIndex !== -1) {
          const fieldToUnhide = getSnapshot(this._projection.hiddenFields[hiddenIndex]);
          this._projection.hiddenFields.splice(hiddenIndex, 1);
          this._projection.fields.push(fieldToUnhide);
          return;
        }
      }

      const field: FieldType = {
        id: createFieldId(),
        path: property,
      };

      this._projection.fields.push(field);
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

      if (targetPropertyName && this._projection.hiddenFields) {
        const hiddenIndex = this._projection.hiddenFields.findIndex((field) => field.path === targetPropertyName);
        if (hiddenIndex !== -1) {
          this._projection.hiddenFields.splice(hiddenIndex, 1);
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
          Object.assign(
            this._projection.fields[fieldIndex],
            clonedField,
            isRename ? { path: targetPropertyName } : undefined,
          );
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
          if (format === FormatEnum.SingleSelect) {
            makeSingleSelectAnnotations(jsonProperty, options);
          }

          if (format === FormatEnum.MultiSelect) {
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
   * 1. Moving schema properties not in view.fields to hiddenFields
   * 2. Removing fields from view.fields and hiddenFields that no longer exist in the schema
   */
  private normalizeView(): void {
    untracked(() => {
      // Get all properties from the schema.
      const schemaProperties = new Set(Object.keys(this._baseSchema.properties ?? {}));

      // 1. Process view.fields - keep ID fields, remove other fields not in schema.
      for (let i = this._projection.fields.length - 1; i >= 0; i--) {
        const field = this._projection.fields[i];
        if (!schemaProperties.has(field.path)) {
          // Remove fields that don't exist in schema anymore.
          this._projection.fields.splice(i, 1);
        }
      }

      // 2. Process hiddenFields - remove fields not in schema.
      if (this._projection.hiddenFields) {
        for (let i = this._projection.hiddenFields.length - 1; i >= 0; i--) {
          const field = this._projection.hiddenFields[i];
          if (!schemaProperties.has(field.path)) {
            this._projection.hiddenFields.splice(i, 1);
          }
        }
      }

      // 3. Find schema properties not in view.fields.
      const viewPaths = new Set(this._projection.fields.map((field) => field.path));
      const hiddenPaths = new Set(this._projection.hiddenFields?.map((field) => field.path) || []);

      // 4. Add missing schema properties to hiddenFields (excluding 'id').
      for (const prop of schemaProperties) {
        if (prop !== 'id' && !viewPaths.has(prop as JsonProp) && !hiddenPaths.has(prop as JsonProp)) {
          // Initialize hiddenFields if needed.
          if (!this._projection.hiddenFields) {
            this._projection.hiddenFields = [];
          }

          // Add new hidden field.
          this._projection.hiddenFields.push({
            id: createFieldId(),
            path: prop as JsonProp,
          });
        }
      }
    });
  }

  /**
   * @deprecated TODO(ZaymonFC): Remove this migration code in a future release once all data is migrated.
   * Migrate legacy single-select format to new format.
   */
  private migrateSingleSelectStoredFormat(): void {
    invariant(this._baseSchema.properties);

    for (const field of this._projection.fields) {
      const jsonProperty: JsonSchemaType = this._baseSchema.properties[field.path] ?? {
        format: FormatEnum.None,
      };
      const { format: schemaFormat = FormatEnum.None, oneOf } = jsonProperty;
      if (schemaFormat !== FormatEnum.SingleSelect) {
        continue;
      }

      const hasLegacyOptions =
        oneOf !== undefined && oneOf?.length !== 0 && oneOf?.every((p) => typeof p.const === 'string');
      if (hasLegacyOptions) {
        const options = (oneOf as any[]).map(({ const: id, title, color }) => ({ id, title, color }));
        log('migrating legacy single-select format', options);
        makeSingleSelectAnnotations(jsonProperty, options);
        jsonProperty.oneOf = [];
      }
    }
  }
}

export const createUniqueProperty = (projection: Projection): JsonProp => {
  let n = 1;
  while (true) {
    const property: JsonProp = `prop_${n++}` as JsonProp;
    const idx = projection.fields.findIndex((field) => field.path === property);
    if (idx === -1) {
      return property;
    }
  }
};
