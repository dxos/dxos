//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type SchemaRegistry } from '@dxos/echo';
import { type EchoSchema, Format, FormatEnums, formatToType } from '@dxos/echo/internal';
import { type SchemaProperty } from '@dxos/effect';
import { log } from '@dxos/log';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';
import {
  type FieldType,
  type ProjectionModel,
  type PropertyType,
  formatToAdditionalPropertyAttributes,
  getFormatSchema,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { getFormProperties } from '../../util';
import { Form, type FormFieldMap, type NewFormRootProps, SelectField, SelectOptionField } from '../Form';

export type FieldEditorProps = {
  projection: ProjectionModel;
  field: FieldType;
  registry?: SchemaRegistry.SchemaRegistry;
  onSave: () => void;
  onCancel?: () => void;
} & Pick<NewFormRootProps<any>, 'readonly'>;

/**
 * Displays a Form representing the metadata for a given `Field` and `View`.
 */
export const FieldEditor = ({ readonly, projection, field, registry, onSave, onCancel }: FieldEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [props, setProps] = useState<PropertyType>(projection.getFieldProjection(field.id).props);
  useEffect(() => setProps(projection.getFieldProjection(field.id).props), [field, projection]);

  const [schemas, setSchemas] = useState<EchoSchema[]>([]);
  useAsyncEffect(async () => {
    if (!registry) {
      return;
    }

    const subscription = registry.query().subscribe((query) => setSchemas(query.results), { fire: true });

    // TODO(dmaretskyi): This shouldn't be needed.
    const schemas = await registry.query().run();
    setSchemas(schemas);

    return () => subscription?.();
  }, [registry]);

  const [referenceSchema, setReferenceSchema] = useState<EchoSchema>();
  useEffect(() => {
    setReferenceSchema(schemas.find((schema) => schema.typename === props?.referenceSchema));
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
            label: t(`format ${value}`),
          }))}
        />
      ),
      ['referenceSchema' satisfies keyof PropertyType]: (props) => (
        <SelectField
          {...props}
          options={schemas.map((schema) => ({
            value: schema.typename,
          }))}
        />
      ),
      ['referencePath' satisfies keyof PropertyType]: (props) => (
        <SelectField
          {...props}
          options={
            referenceSchema
              ? getFormProperties(referenceSchema.ast)
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

  const propIsNotType = useCallback((props: SchemaProperty[]) => props.filter((prop) => prop.name !== 'type'), []);

  const handleValuesChanged = useCallback<NonNullable<NewFormRootProps<PropertyType>['onValuesChanged']>>(
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
        if (_props.referenceSchema !== prev?.typename) {
          const newSchema = schemas.find((schema) => schema.typename === _props.referenceSchema);
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

  const handleValidate = useCallback<NonNullable<NewFormRootProps<PropertyType>['onValidate']>>(
    ({ property }) => {
      if (property && projection.fields.find((f) => f.path === property && f.path !== field.path)) {
        return [
          {
            path: 'property',
            message: `property is not unique: '${property}'`,
          },
        ];
      }
    },
    [projection.fields, field],
  );

  const handleSave = useCallback<NonNullable<NewFormRootProps<PropertyType>['onSave']>>(
    (props) => {
      projection.setFieldProjection({ field, props });
      onSave();
    },
    [projection, field, onSave],
  );

  const handleCancel = useCallback<NonNullable<NewFormRootProps<PropertyType>['onCancel']>>(() => {
    // Need to defer to allow form to close.
    requestAnimationFrame(() => onCancel?.());
    onSave();
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
      exclude={propIsNotType}
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
