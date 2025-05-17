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
import { PublicKey } from '@dxos/keys';
import { getSnapshot } from '@dxos/live-object';
import { log } from '@dxos/log';
import { omit, pick } from '@dxos/util';

import { PropertySchema, type PropertyType } from './format';
import { makeMultiSelectAnnotations, makeSingleSelectAnnotations } from './util';
import { type ViewType, type FieldType } from './view';

export const VIEW_FIELD_LIMIT = 32;

/**
 * Composite of view and schema metadata for a property.
 */
export type FieldProjection = {
  field: FieldType;
  props: PropertyType;
};

/**
 * Wrapper for View that manages Field and Format updates.
 */
export class ViewProjection {
  private readonly _encode = Schema.encodeSync(PropertySchema);
  private readonly _decode = Schema.decodeSync(PropertySchema, {});

  private _fieldProjections = computed(() => this._view.fields.map((field) => this.getFieldProjection(field.id)));
  private _hiddenProperties = computed(() => this._view.hiddenFields?.map((field) => field.path as string) ?? []);

  // TOOD(burdon): Should this take an instane of S.S.AnyNoContext and derive the JsonSchemaType itselft (and watch for reactivity)?
  constructor(
    /** Possibly reactive object. */
    // TODO(burdon): Pass in boolean readonly?
    private readonly _schema: JsonSchemaType,
    private readonly _view: ViewType,
  ) {
    this.normalizeView();
    this.migrateSingleSelectStoredFormat();
  }

  get view() {
    return this._view;
  }

  /**
   * Construct a new property.
   */
  createFieldProjection(): FieldType {
    invariant(this._view.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);

    const field: FieldType = {
      id: createFieldId(),
      path: createUniqueProperty(this._view),
    };

    log('createFieldProjection', { field });
    this._view.fields.push(field);
    return field;
  }

  getFieldId(path: string): string | undefined {
    return this._view.fields.find((field) => field.path === path)?.id;
  }

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  getFieldProjection(fieldId: string): FieldProjection {
    invariant(this._schema.properties);
    const field = this._view.fields.find((field) => field.id === fieldId);
    invariant(field, `invalid field: ${fieldId}`);
    invariant(field.path.indexOf('.') === -1);

    const jsonProperty: JsonSchemaType = this._schema.properties[field.path] ?? { format: FormatEnum.None };
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
    invariant(this._schema.properties);
    const field = this._view.fields.find((field) => field.id === fieldId);
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
      const index = this._view.fields.findIndex((field) => field.id === fieldId);
      if (index !== -1) {
        const fieldToHide = getSnapshot(this._view.fields[index]);
        this._view.fields.splice(index, 1);
        if (!this._view.hiddenFields) {
          this._view.hiddenFields = [];
        }

        this._view.hiddenFields.push(fieldToHide);
      }
    });
  }

  showFieldProjection(property: JsonProp): void {
    untracked(() => {
      invariant(this._schema.properties);
      invariant(property in this._schema.properties);

      const existingField = this._view.fields.find((field) => field.path === property);
      if (existingField) {
        return;
      }

      if (this._view.hiddenFields) {
        const hiddenIndex = this._view.hiddenFields.findIndex((field) => field.path === property);

        if (hiddenIndex !== -1) {
          const fieldToUnhide = getSnapshot(this._view.hiddenFields[hiddenIndex]);
          this._view.hiddenFields.splice(hiddenIndex, 1);
          this._view.fields.push(fieldToUnhide);
          return;
        }
      }

      const field: FieldType = {
        id: createFieldId(),
        path: property,
      };

      this._view.fields.push(field);
    });
  }

  /**
   * Update JSON schema property annotations and view fields.
   * @param projection The field and props to update
   * @param index Optional index for inserting new fields. Ignored when updating existing fields.
   */
  setFieldProjection({ field, props }: Partial<FieldProjection>, index?: number) {
    log('setFieldProjection', { field, props, index });

    untracked(() => {
      const sourcePropertyName = field?.path;
      const targetPropertyName = props?.property;
      const hasSourceAndTarget = !!sourcePropertyName && !!targetPropertyName;
      const isRename = hasSourceAndTarget && sourcePropertyName !== targetPropertyName;

      if (targetPropertyName && this._view.hiddenFields) {
        const hiddenIndex = this._view.hiddenFields.findIndex((field) => field.path === targetPropertyName);
        if (hiddenIndex !== -1) {
          this._view.hiddenFields.splice(hiddenIndex, 1);
        }
      }

      // TODO(burdon): Set field if does not exist.
      if (field) {
        const propsValues = props ? (pick(props, ['referencePath']) as Partial<FieldType>) : undefined;
        const clonedField: FieldType = { ...field, ...propsValues };
        const fieldIndex = this._view.fields.findIndex((field) => field.path === sourcePropertyName);
        if (fieldIndex === -1) {
          invariant(this._view.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);
          if (index !== undefined && index >= 0 && index <= this._view.fields.length) {
            this._view.fields.splice(index, 0, clonedField);
          } else {
            this._view.fields.push(clonedField);
          }
        } else {
          Object.assign(
            this._view.fields[fieldIndex],
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
          type = undefined;
          format = undefined;
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
        this._schema.properties ??= {};
        this._schema.properties[property] = { type, format, ...jsonProperty, ...rest };
        if (isRename) {
          delete this._schema.properties[sourcePropertyName!];
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
      const fieldIndex = this._view.fields.findIndex((field) => field.id === fieldId);
      if (fieldIndex !== -1) {
        this._view.fields.splice(fieldIndex, 1);
      }

      // Delete property.
      invariant(this._schema.properties, 'Schema properties must exist');
      invariant(snapshot.field.path, 'Field path must exist');
      delete this._schema.properties[snapshot.field.path];

      // check that it's actually gone
      invariant(!this._schema.properties[snapshot.field.path], 'Field path still exists');

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
      const schemaProperties = new Set(Object.keys(this._schema.properties ?? {}));

      // 1. Process view.fields - keep ID fields, remove other fields not in schema.
      for (let i = this._view.fields.length - 1; i >= 0; i--) {
        const field = this._view.fields[i];
        if (!schemaProperties.has(field.path)) {
          // Remove fields that don't exist in schema anymore.
          this._view.fields.splice(i, 1);
        }
      }

      // 2. Process hiddenFields - remove fields not in schema.
      if (this._view.hiddenFields) {
        for (let i = this._view.hiddenFields.length - 1; i >= 0; i--) {
          const field = this._view.hiddenFields[i];
          if (!schemaProperties.has(field.path)) {
            this._view.hiddenFields.splice(i, 1);
          }
        }
      }

      // 3. Find schema properties not in view.fields.
      const viewPaths = new Set(this._view.fields.map((field) => field.path));
      const hiddenPaths = new Set(this._view.hiddenFields?.map((field) => field.path) || []);

      // 4. Add missing schema properties to hiddenFields (excluding 'id').
      for (const prop of schemaProperties) {
        if (prop !== 'id' && !viewPaths.has(prop as JsonProp) && !hiddenPaths.has(prop as JsonProp)) {
          // Initialize hiddenFields if needed.
          if (!this._view.hiddenFields) {
            this._view.hiddenFields = [];
          }

          // Add new hidden field.
          this._view.hiddenFields.push({
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
    invariant(this._schema.properties);

    for (const field of this._view.fields) {
      const jsonProperty: JsonSchemaType = this._schema.properties[field.path] ?? {
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
        log.info('Migrating legacy single-select format', options);
        makeSingleSelectAnnotations(jsonProperty, options);
        jsonProperty.oneOf = [];
      }
    }
  }
}

export const createFieldId = () => PublicKey.random().truncate();

export const createUniqueProperty = (view: ViewType): JsonProp => {
  let n = 1;
  while (true) {
    const property: JsonProp = `prop_${n++}` as JsonProp;
    const idx = view.fields.findIndex((field) => field.path === property);
    if (idx === -1) {
      return property;
    }
  }
};
