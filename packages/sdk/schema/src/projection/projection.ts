//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Entity, Format, Obj } from '@dxos/echo';
import {
  type EchoSchema,
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
 * Callback type for wrapping mutations in Obj.change().
 * Contains separate callbacks for projection and schema mutations
 * since Obj.change() cannot be nested.
 * Note: Callbacks return void because Obj.change() returns void.
 */
export type ProjectionChangeCallback = {
  /** Callback to wrap projection mutations. */
  projection: (mutate: (mutableProjection: View.Projection) => void) => void;
  /** Callback to wrap schema mutations. */
  schema: (mutate: (mutableSchema: JsonSchemaType) => void) => void;
};

/**
 * Creates a change callback for ECHO-backed View and EchoSchema objects.
 * Use this when the view and schema are stored in the ECHO database.
 *
 * Note: Type assertions are needed because:
 * 1. PersistentSchema's type doesn't include [KindId] but runtime value does
 * 2. Inside Obj.change, the mutable object has different type constraints
 */
export const createEchoChangeCallback = (view: View.View, schema: EchoSchema): ProjectionChangeCallback => ({
  projection: (mutate) => Obj.change(view, (v) => mutate(v.projection as View.Projection)),
  schema: (mutate) => Obj.change(schema.persistentSchema as unknown as Entity.Any, (s: any) => mutate(s.jsonSchema)),
});

/**
 * Creates a change callback that directly mutates objects without wrapping.
 * Use this for plain JavaScript objects (tests, non-ECHO scenarios).
 */
export const createDirectChangeCallback = (
  projection: View.Projection,
  schema: JsonSchemaType,
): ProjectionChangeCallback => ({
  projection: (mutate) => mutate(projection),
  schema: (mutate) => mutate(schema),
});

/**
 * Wrapper for Projection that manages Field and Format updates.
 */
export class ProjectionModel {
  private readonly _encode = Schema.encodeSync(PropertySchema);
  private readonly _decode = Schema.decodeSync(PropertySchema, {});

  // TOOD(burdon): Take an instance of S.S.AnyNoContext and derive the JsonSchemaType (and watch for reactivity)?
  constructor(
    // TODO(burdon): Pass in boolean readonly?
    private readonly _baseSchema: Live<JsonSchemaType>,
    private readonly _projection: Live<View.Projection>,
    /**
     * Callbacks to wrap mutations in Obj.change().
     * Mutating operations will invoke these callbacks with mutator functions.
     * Each callback is responsible for calling Obj.change() and providing the mutable version.
     * Use createEchoChangeCallback() for ECHO-backed objects or createDirectChangeCallback() for plain objects.
     */
    private readonly _change: ProjectionChangeCallback,
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
   */
  get fields() {
    return this._projection.fields.filter((field) => field.visible !== false);
  }

  /**
   * The hidden fields in the projection.
   */
  get hiddenFields() {
    return this._projection.fields.filter((field) => field.visible === false);
  }

  /**
   * All fields in the projection (both visible and hidden).
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
    this._change.projection((projection) => {
      projection.fields.push(field);
    });
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
   * Get all field projections.
   */
  getFieldProjections(): FieldProjection[] {
    return this._projection.fields.map((field) => this.getFieldProjection(field.id));
  }

  /**
   * Identifies schema properties not visible in the current view projection.
   * @returns Schema property names that aren't mapped to any view field path, returned as an alphabetically sorted string array.
   */
  getHiddenProperties(): string[] {
    return this.hiddenFields.map((field) => field.path as string) ?? [];
  }

  /**
   * Hides a field from the view by setting its visible flag to false.
   */
  hideFieldProjection(fieldId: string): void {
    this._change.projection((projection) => {
      const field = projection.fields.find((field) => field.id === fieldId);
      if (field) {
        field.visible = false;
      }
    });
  }

  showFieldProjection(property: JsonProp): void {
    invariant(this._baseSchema.properties);
    invariant(property in this._baseSchema.properties);

    this._change.projection((projection) => {
      const existingField = projection.fields.find((field) => field.path === property);
      if (existingField) {
        existingField.visible = true;
      } else {
        projection.fields.unshift({
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

    const sourcePropertyName = field?.path;
    const targetPropertyName = props?.property;
    const hasSourceAndTarget = !!sourcePropertyName && !!targetPropertyName;
    const isRename = hasSourceAndTarget && sourcePropertyName !== targetPropertyName;

    // Update projection fields.
    if (field || targetPropertyName) {
      this._change.projection((projection) => {
        if (targetPropertyName) {
          const existingField = projection.fields.find((f) => f.path === targetPropertyName);
          if (existingField && existingField.visible === false) {
            existingField.visible = true;
          }
        }

        // TODO(burdon): Set field if does not exist.
        if (field) {
          const propsValues = props ? (pick(props, ['referencePath']) as Partial<FieldType>) : undefined;
          const clonedField: FieldType = { ...field, ...propsValues };
          const fieldIndex = projection.fields.findIndex((f) => f.path === sourcePropertyName);
          if (fieldIndex === -1) {
            invariant(projection.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);
            if (index !== undefined && index >= 0 && index <= projection.fields.length) {
              projection.fields.splice(index, 0, clonedField);
            } else {
              projection.fields.push(clonedField);
            }
          } else {
            Object.assign(
              projection.fields[fieldIndex],
              clonedField,
              isRename ? { path: targetPropertyName } : undefined,
            );
          }
        }
      });
    }

    // Update schema properties.
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
      this._change.schema((baseSchema) => {
        baseSchema.properties ??= {};
        baseSchema.properties[property!] = { type, format, ...jsonProperty, ...rest };
        if (isRename) {
          delete baseSchema.properties[sourcePropertyName!];

          // Update propertyOrder array if it exists
          if (baseSchema.propertyOrder) {
            const orderIndex = baseSchema.propertyOrder.indexOf(sourcePropertyName!);
            if (orderIndex !== -1) {
              baseSchema.propertyOrder[orderIndex] = property!;
            }
          }

          // Update required array if it exists
          if (baseSchema.required) {
            const requiredIndex = baseSchema.required.indexOf(sourcePropertyName!);
            if (requiredIndex !== -1) {
              baseSchema.required[requiredIndex] = property!;
            }
          }
        }
      });
    }
  }

  /**
   * Delete a field from the view and return the deleted projection for potential undo.
   */
  deleteFieldProjection(fieldId: string): { deleted: FieldProjection; index: number } {
    // NOTE(ZaymonFC): We need to clone this because the underlying object is going to be modified.
    const current = this.getFieldProjection(fieldId);
    invariant(current, `Field projection not found for fieldId: ${fieldId}`);

    const snapshot = getSnapshot(current);

    // Calculate field index before deleting (Obj.change returns void, so we can't get return values from the callback).
    const fieldIndex = this._projection.fields.findIndex((field) => field.id === fieldId);

    // Delete field from projection.
    this._change.projection((projection) => {
      const idx = projection.fields.findIndex((field) => field.id === fieldId);
      if (idx !== -1) {
        projection.fields.splice(idx, 1);
      }
    });

    // Delete property from schema.
    this._change.schema((baseSchema) => {
      invariant(baseSchema.properties, 'Schema properties must exist');
      invariant(snapshot.field.path, 'Field path must exist');
      delete baseSchema.properties[snapshot.field.path];

      // Check that it's actually gone.
      invariant(!baseSchema.properties[snapshot.field.path], 'Field path still exists');
    });

    return { deleted: snapshot, index: fieldIndex };
  }

  /**
   * Normalizes the view by:
   * 1. Removing fields that no longer exist in the schema
   * 2. Adding missing schema properties as hidden fields
   */
  normalizeView(): void {
    // Get all properties from the schema.
    const schemaProperties = new Set(Object.keys(this._baseSchema.properties ?? {}));

    this._change.projection((projection) => {
      // 1. Remove fields that don't exist in schema anymore.
      for (let i = projection.fields.length - 1; i >= 0; i--) {
        const field = projection.fields[i];
        if (!schemaProperties.has(field.path)) {
          projection.fields.splice(i, 1);
        }
      }

      // 2. Find schema properties not represented in any field.
      const fieldPaths = new Set(projection.fields.map((field) => field.path));

      // 3. Add missing schema properties as hidden fields (excluding 'id').
      for (const prop of schemaProperties) {
        if (prop !== 'id' && !fieldPaths.has(prop as JsonProp)) {
          // Add new hidden field.
          projection.fields.push({
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
