//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type Registry, type View, Filter, Obj, Type } from '@dxos/echo';
import { Format, FormatEnums, formatToType } from '@dxos/echo/Format';
import { SchemaEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';
import {
  type ProjectionModel,
  type PropertyType,
  formatToAdditionalPropertyAttributes,
  getFormatSchema,
} from '@dxos/schema';

import { translationKey } from '#translations';
import { type FormFieldMap } from '#types';

import { getFormProperties } from '../../util';
import { type FormRootProps, Form, SelectField, SelectOptionField } from '../Form';

export type FieldEditorProps = Pick<FormRootProps<any>, 'readonly'> & {
  projection: ProjectionModel;
  field: View.FieldType;
  registry?: Registry.Registry;
  view?: Obj.Unknown;
  onSave: () => void;
  onCancel?: () => void;
};

/**
 * Displays a Form representing the metadata for a `Field` within a given `View`.
 */
export const FieldEditor = ({ readonly, projection, field, registry, view, onSave, onCancel }: FieldEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [props, setProps] = useState<PropertyType>(projection.getFieldProjection(field.id).props);
  useEffect(() => setProps(projection.getFieldProjection(field.id).props), [field, projection]);

  const [schemas, setSchemas] = useState<Type.Type[]>([]);
  useAsyncEffect(async () => {
    if (!registry) {
      return;
    }

    const subscription = registry
      .query(Filter.type(Type.Type))
      .subscribe((query) => setSchemas(query.results), { fire: true });

    // TODO(dmaretskyi): This shouldn't be needed.
    const schemas = await registry.query(Filter.type(Type.Type)).run();
    setSchemas(schemas);

    return () => subscription?.();
  }, [registry]);

  const [referenceSchema, setReferenceSchema] = useState<Type.Type>();
  useEffect(() => {
    setReferenceSchema(schemas.find((schema) => Type.getTypename(schema) === props?.referenceSchema));
  }, [schemas, props?.referenceSchema]);

  // TODO(burdon): Need to wrap otherwise throws error:
  //  Class constructor SchemaClass cannot be invoked without 'new'.
  const [{ fieldSchema }, setFieldSchema] = useState({ fieldSchema: getFormatSchema(props?.format) });

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      ['format' satisfies keyof PropertyType]: (props) => (
        <SelectField
          {...props}
          options={FormatEnums.filter((value) => value !== Format.TypeFormat.None).map((value) => ({
            value,
            label: t(`format.${value}.label`),
          }))}
        />
      ),
      ['referenceSchema' satisfies keyof PropertyType]: (props) => (
        <SelectField
          {...props}
          options={schemas
            .map((schema) => Type.getTypename(schema))
            .filter((typename): typename is string => typename != null)
            .map((typename) => ({
              value: typename,
            }))}
        />
      ),
      ['referencePath' satisfies keyof PropertyType]: (props) => (
        <SelectField
          {...props}
          options={
            referenceSchema
              ? getFormProperties(Type.getSchema(referenceSchema).ast)
                  .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
                  .map((p) => ({ value: p.name.toString() }))
              : []
          }
        />
      ),
      ['options' satisfies keyof PropertyType]: (props) => <SelectOptionField {...props} />,
    }),
    [t, schemas, referenceSchema],
  );

  const propIsNotType = useCallback(
    (props: SchemaEx.SchemaProperty[]) => props.filter((prop) => prop.name !== 'type'),
    [],
  );

  const handleValuesChanged = useCallback<NonNullable<FormRootProps<PropertyType>['onValuesChanged']>>(
    (_props) => {
      // TODO(Zaymon): Workout why old and new format values are the same sometimes even when selecting novel format values.
      setFieldSchema((prev) => {
        const fieldSchema = getFormatSchema(_props.format);
        if (prev.fieldSchema === fieldSchema) {
          return prev;
        }
        return { fieldSchema };
      });

      setReferenceSchema((prev) => {
        if (_props.referenceSchema !== (prev ? Type.getTypename(prev) : undefined)) {
          const newSchema = schemas.find((schema) => Type.getTypename(schema) === _props.referenceSchema);
          if (newSchema) {
            return newSchema;
          }
        }
        return prev;
      });

      setProps((props) => {
        const type = formatToType[_props.format as keyof typeof formatToType];
        const additionalProps =
          formatToAdditionalPropertyAttributes[_props.format as keyof typeof formatToAdditionalPropertyAttributes];
        if (props.type !== type) {
          return { ...props, ..._props, ...additionalProps, type } as PropertyType;
        }

        return _props as PropertyType;
      });
    },
    [schemas, props.format, props.referenceSchema],
  );

  const handleValidate = useCallback<NonNullable<FormRootProps<PropertyType>['onValidate']>>(
    ({ property }) => {
      if (property && projection.getFields().find((f) => f.path === property && f.path !== field.path)) {
        return [
          {
            path: 'property',
            message: `property is not unique: '${property}'`,
          },
        ];
      }
    },
    [projection.getFields(), field],
  );

  const handleSave = useCallback<NonNullable<FormRootProps<PropertyType>['onSave']>>(
    (props) => {
      if (view) {
        Obj.update(view, () => {
          projection.setFieldProjection({ field, props });
        });
      } else {
        projection.setFieldProjection({ field, props });
      }
      onSave();
    },
    [projection, field, view, onSave],
  );

  const handleCancel = useCallback<NonNullable<FormRootProps<PropertyType>['onCancel']>>(() => {
    onSave();
    // Need to defer to allow form to close.
    requestAnimationFrame(() => onCancel?.());
  }, [onSave]);

  if (!fieldSchema) {
    log.warn('invalid format', { props });
    return null;
  }

  return (
    <Form.Root<PropertyType>
      key={field.id}
      fieldMap={fieldMap}
      autoFocus
      readonly={readonly}
      schema={fieldSchema}
      values={props}
      filter={propIsNotType}
      sort={['property', 'format']}
      onValuesChanged={handleValuesChanged}
      onValidate={handleValidate}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <Form.Content>
        <Form.FieldSet />
        <Form.Actions />
      </Form.Content>
    </Form.Root>
  );
};
