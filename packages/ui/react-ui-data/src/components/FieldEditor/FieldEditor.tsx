//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type SchemaResolver } from '@dxos/echo-db';
import { FormatEnum, FormatEnums, formatToType, type MutableSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import {
  getFormatSchema,
  getSchemaProperties,
  sortProperties,
  type FieldType,
  type PropertyType,
  type ViewType,
  type ViewProjection,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { Form, FormInput, type FormProps } from '../Form';

export type FieldEditorProps = {
  view: ViewType;
  projection: ViewProjection;
  field: FieldType;
  registry?: SchemaResolver;
  onClose: () => void;
  onCancel?: () => void;
};

/**
 * Displays a Form representing the metadata for a given `Field` and `View`.
 */
export const FieldEditor = ({ view, projection, field, registry, onClose, onCancel }: FieldEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [props, setProps] = useState<PropertyType>(projection.getFieldProjection(field.id).props);
  useEffect(() => setProps(projection.getFieldProjection(field.id).props), [field, projection]);

  const [schemas, setSchemas] = useState<MutableSchema[]>([]);
  useEffect(() => {
    if (!registry) {
      return;
    }

    const subscription = registry.subscribe(setSchemas);
    const t = setTimeout(async () => {
      const schemas = await registry.query();
      setSchemas(schemas);
    });
    return () => {
      clearTimeout(t);
      subscription?.();
    };
  }, [registry]);

  const [schema, setSchema] = useState<MutableSchema>();
  useEffect(() => {
    setSchema(schemas.find((schema) => schema.typename === props?.referenceSchema));
  }, [schemas, props?.referenceSchema]);

  // TODO(burdon): Need to wrap otherwise throws error:
  //  Class constructor SchemaClass cannot be invoked without 'new'.
  const [{ fieldSchema }, setFieldSchema] = useState({ fieldSchema: getFormatSchema(props?.format) });
  const handleValuesChanged = useCallback<NonNullable<FormProps<PropertyType>['onValuesChanged']>>(
    (_props) => {
      // Update schema if format changed.
      // TODO(burdon): Callback should pass `changed` to indicate which fields have changed.
      if (_props.format !== props.format) {
        setFieldSchema({ fieldSchema: getFormatSchema(_props.format) });
      }
      if (_props.referenceSchema !== props.referenceSchema) {
        setSchema(schemas.find((schema) => schema.typename === _props.referenceSchema));
      }

      setProps((props) => {
        const type = formatToType[_props.format as keyof typeof formatToType];
        if (props.type !== type) {
          return { ...props, ..._props, type };
        }

        return props;
      });
    },
    [schemas, props],
  );

  const handleValidate = useCallback<NonNullable<FormProps<PropertyType>['onValidate']>>(
    ({ property }) => {
      if (property && view.fields.find((f) => f.path === property && f.path !== field.path)) {
        return [
          {
            path: 'property',
            message: `property is not unique: '${property}'`,
          },
        ];
      }
    },
    [view.fields, field],
  );

  const handleSave = useCallback<NonNullable<FormProps<PropertyType>['onSave']>>(
    (props) => {
      projection.setFieldProjection({ field, props });
      onClose();
    },
    [projection, field, onClose],
  );

  const handleCancel = useCallback<NonNullable<FormProps<PropertyType>['onCancel']>>(() => {
    // Need to defer to allow form to close.
    requestAnimationFrame(() => onCancel?.());
    onClose();
  }, [onClose]);

  if (!fieldSchema) {
    log.warn('invalid format', { props });
    return null;
  }

  return (
    <Form<PropertyType>
      key={field.id}
      autoFocus
      values={props}
      schema={fieldSchema}
      filter={(props) => props.filter((p) => p.property !== 'type')}
      sort={['property', 'format']}
      onValuesChanged={handleValuesChanged}
      onValidate={handleValidate}
      onSave={handleSave}
      onCancel={handleCancel}
      Custom={{
        format: (props) => (
          <FormInput<PropertyType>
            {...props}
            options={FormatEnums.filter((value) => value !== FormatEnum.None).map((value) => ({
              value,
              label: t(`format ${value}`),
            }))}
          />
        ),
        referenceSchema: (props) => (
          <FormInput<PropertyType>
            {...props}
            options={schemas.map((schema) => ({
              value: schema.typename,
            }))}
          />
        ),
        referencePath: (props) => (
          <FormInput<PropertyType>
            {...props}
            options={
              schema
                ? getSchemaProperties(schema.schema)
                    .sort(sortProperties)
                    .map((p) => ({ value: p.property }))
                : []
            }
          />
        ),
      }}
    />
  );
};
