//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type SchemaRegistry } from '@dxos/echo-db';
import { FormatEnum, FormatEnums, formatToType, type EchoSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import {
  getFormatSchema,
  getSchemaProperties,
  sortProperties,
  type FieldType,
  type PropertyType,
  type ProjectionManager,
  type SchemaProperty,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { Form, type FormProps, type InputComponent, SelectInput, SelectOptionInput } from '../Form';

export type FieldEditorProps = {
  projection: ProjectionManager;
  field: FieldType;
  registry?: SchemaRegistry;
  onSave: () => void;
  onCancel?: () => void;
} & Pick<FormProps<any>, 'outerSpacing'>;

/**
 * Displays a Form representing the metadata for a given `Field` and `View`.
 */
export const FieldEditor = ({
  projection: manager,
  field,
  registry,
  onSave,
  onCancel,
  outerSpacing,
}: FieldEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [props, setProps] = useState<PropertyType>(manager.getFieldProjection(field.id).props);
  useEffect(() => setProps(manager.getFieldProjection(field.id).props), [field, manager]);

  const [schemas, setSchemas] = useState<EchoSchema[]>([]);
  useEffect(() => {
    if (!registry) {
      return;
    }

    const subscription = registry.query().subscribe((query) => setSchemas(query.results), { fire: true });

    // TODO(dmaretskyi): This shouldn't be needed.
    const t = setTimeout(async () => {
      const schemas = await registry.query().run();
      setSchemas(schemas);
    });
    return () => {
      clearTimeout(t);
      subscription?.();
    };
  }, [registry]);

  const [referenceSchema, setReferenceSchema] = useState<EchoSchema>();
  useEffect(() => {
    setReferenceSchema(schemas.find((schema) => schema.typename === props?.referenceSchema));
  }, [schemas, props?.referenceSchema]);

  // TODO(burdon): Need to wrap otherwise throws error:
  //  Class constructor SchemaClass cannot be invoked without 'new'.
  const [{ fieldSchema }, setFieldSchema] = useState({ fieldSchema: getFormatSchema(props?.format) });

  const handleValuesChanged = useCallback<NonNullable<FormProps<PropertyType>['onValuesChanged']>>(
    (_props) => {
      // TODO(burdon): Callback should pass `changed` to indicate which fields have changed.
      // TODO(Zaymon): Workout why old and new format values are the same sometimes even when
      //   selecting novel format values.
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
        if (props.type !== type) {
          return { ...props, ..._props, type };
        }

        return _props as PropertyType;
      });
    },
    [schemas, props.format, props.referenceSchema],
  );

  const handleValidate = useCallback<NonNullable<FormProps<PropertyType>['onValidate']>>(
    ({ property }) => {
      if (property && manager.projection.fields.find((f) => f.path === property && f.path !== field.path)) {
        return [
          {
            path: 'property',
            message: `property is not unique: '${property}'`,
          },
        ];
      }
    },
    [manager.projection.fields, field],
  );

  const handleSave = useCallback<NonNullable<FormProps<PropertyType>['onSave']>>(
    (props) => {
      manager.setFieldProjection({ field, props });
      onSave();
    },
    [manager, field, onSave],
  );

  const handleCancel = useCallback<NonNullable<FormProps<PropertyType>['onCancel']>>(() => {
    // Need to defer to allow form to close.
    requestAnimationFrame(() => onCancel?.());
    onSave();
  }, [onSave]);

  const custom: Partial<Record<string, InputComponent>> = useMemo(
    () => ({
      ['format' satisfies keyof PropertyType]: (props) => (
        <SelectInput
          {...props}
          options={FormatEnums.filter((value) => value !== FormatEnum.None).map((value) => ({
            value,
            label: t(`format ${value}`),
          }))}
        />
      ),
      ['referenceSchema' satisfies keyof PropertyType]: (props) => (
        <SelectInput
          {...props}
          options={schemas.map((schema) => ({
            value: schema.typename,
          }))}
        />
      ),
      ['referencePath' satisfies keyof PropertyType]: (props) => (
        <SelectInput
          {...props}
          options={
            referenceSchema
              ? getSchemaProperties(referenceSchema.ast)
                  .sort(sortProperties)
                  .map((p) => ({ value: p.name }))
              : []
          }
        />
      ),
      ['options' satisfies keyof PropertyType]: (props) => <SelectOptionInput {...props} />,
    }),
    [t, schemas, referenceSchema],
  );

  const propIsNotType = useCallback(
    (props: SchemaProperty<PropertyType>[]) => props.filter((p) => p.name !== 'type'),
    [],
  );

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
      filter={propIsNotType}
      sort={['property', 'format']}
      onValuesChanged={handleValuesChanged}
      onValidate={handleValidate}
      onSave={handleSave}
      onCancel={handleCancel}
      Custom={custom}
      outerSpacing={outerSpacing}
    />
  );
};
