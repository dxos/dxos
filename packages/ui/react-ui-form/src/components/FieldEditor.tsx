//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Filter, Obj, type Registry, Type, type View } from '@dxos/echo';
import { Format, FormatEnums, formatToType } from '@dxos/echo/Format';
import { type SchemaEx } from '@dxos/effect';
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

import { getFormProperties } from '../util/index.ts';
import { SelectField, SelectOptionField } from './fields/index.ts';
import { Form, type FormRootProps } from './Form.tsx';

export type FieldEditorProps = Pick<FormRootProps<PropertyType>, 'readonly'> & {
  projection: ProjectionModel;
  field: View.FieldType;
  registry?: Registry.Registry;
  view?: Obj.Unknown;
  onSave: () => void;
  onCancel?: () => void;
};

const omitType = (props: SchemaEx.SchemaProperty[]) => props.filter((prop) => prop.name !== 'type');

/**
 * Edits a view field's projection (property, format, options, reference) on `react-ui-form`; the current
 * FieldEditor's logic with Next renderers.
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
    setSchemas(await registry.query(Filter.type(Type.Type)).run());
    return () => subscription?.();
  }, [registry]);

  // A `Type.Type` is a class, which a state setter would call as an updater, so it is stored through a lambda.
  const [referenceSchema, setReferenceSchema] = useState<Type.Type>();
  useEffect(() => {
    setReferenceSchema(() => schemas.find((schema) => Type.getTypename(schema) === props?.referenceSchema));
  }, [schemas, props?.referenceSchema]);

  // Wrapped in an object for the same reason: a schema class must not reach a setter directly.
  const [{ fieldSchema }, setFieldSchema] = useState({ fieldSchema: getFormatSchema(props?.format) });

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      ['format' satisfies keyof PropertyType]: (fieldProps) => (
        <Form.Field path={fieldProps.jsonPath}>
          <SelectField
            {...fieldProps}
            options={FormatEnums.filter((value) => value !== Format.TypeFormat.None).map((value) => ({
              value,
              label: t(`format.${value}.label`),
            }))}
          />
        </Form.Field>
      ),
      ['referenceSchema' satisfies keyof PropertyType]: (fieldProps) => (
        <Form.Field path={fieldProps.jsonPath}>
          <SelectField
            {...fieldProps}
            options={schemas
              .map((schema) => Type.getTypename(schema))
              .filter((typename): typename is string => typename != null)
              .map((typename) => ({ value: typename }))}
          />
        </Form.Field>
      ),
      ['referencePath' satisfies keyof PropertyType]: (fieldProps) => (
        <Form.Field path={fieldProps.jsonPath}>
          <SelectField
            {...fieldProps}
            options={
              referenceSchema
                ? getFormProperties(Type.getSchema(referenceSchema).ast)
                    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
                    .map((prop) => ({ value: prop.name.toString() }))
                : []
            }
          />
        </Form.Field>
      ),
      ['options' satisfies keyof PropertyType]: (fieldProps) => (
        <Form.Field path={fieldProps.jsonPath} standalone>
          <SelectOptionField {...fieldProps} />
        </Form.Field>
      ),
    }),
    [t, schemas, referenceSchema],
  );

  const handleValuesChanged = useCallback<NonNullable<FormRootProps<PropertyType>['onValuesChanged']>>(
    (next) => {
      setFieldSchema((previous) => {
        const fieldSchema = getFormatSchema(next.format);
        return previous.fieldSchema === fieldSchema ? previous : { fieldSchema };
      });
      setReferenceSchema((previous) => {
        if (next.referenceSchema !== (previous ? Type.getTypename(previous) : undefined)) {
          return schemas.find((schema) => Type.getTypename(schema) === next.referenceSchema) ?? previous;
        }
        return previous;
      });
      setProps((current) => {
        const type = next.format ? formatToType[next.format] : current.type;
        // The format's extra JSON-schema attributes (e.g. a currency's multipleOf), not its JSON-schema `format` string.
        const { format: _format, ...additional } = next.format ? formatToAdditionalPropertyAttributes[next.format] : {};
        return current.type !== type ? { ...current, ...next, ...additional, type } : { ...current, ...next };
      });
    },
    [schemas],
  );

  const handleValidate = useCallback<NonNullable<FormRootProps<PropertyType>['onValidate']>>(
    ({ property }) => {
      if (property && projection.getFields().find((other) => other.path === property && other.path !== field.path)) {
        return [{ path: 'property', message: `property is not unique: '${property}'` }];
      }
    },
    [projection, field],
  );

  const handleSave = useCallback<NonNullable<FormRootProps<PropertyType>['onSave']>>(
    (next) => {
      if (view) {
        // The projection writes into the view, so the write runs inside the view's update.
        Obj.update(view, (view) => {
          projection.setFieldProjection({ field, props: next });
        });
      } else {
        projection.setFieldProjection({ field, props: next });
      }
      onSave();
    },
    [projection, field, view, onSave],
  );

  const handleCancel = useCallback(() => {
    onSave();
    // Deferred so the form can close first.
    requestAnimationFrame(() => onCancel?.());
  }, [onSave, onCancel]);

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
      onValuesChanged={handleValuesChanged}
      onValidate={handleValidate}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <Form.Content>
        <Form.Fields filter={omitType} sort={['property', 'format']} />
        <Form.Actions />
      </Form.Content>
    </Form.Root>
  );
};
