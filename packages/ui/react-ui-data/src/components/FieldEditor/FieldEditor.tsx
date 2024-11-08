//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type SchemaResolver } from '@dxos/echo-db';
import { FormatEnum, FormatEnums, formatToType } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import {
  getPropertySchemaForFormat,
  type FieldType,
  type ViewType,
  type ViewProjection,
  type PropertyType,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { Form, FormInput } from '../Form';

export type FieldEditorProps = {
  view: ViewType;
  projection: ViewProjection;
  field: FieldType;
  registry?: SchemaResolver;
  onClose: () => void;
};

export const FieldEditor = ({ view, projection, field, onClose }: FieldEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [props, setProps] = useState<PropertyType>(projection.getFieldProjection(field.property).props);

  useEffect(() => {
    const { props } = projection.getFieldProjection(field.property);
    setProps(props);
  }, [field, projection]);

  // TODO(burdon): Need to wrap otherwise throws error:
  //  Class constructor SchemaClass cannot be invoked without 'new'.
  const [{ fieldSchema }, setFieldSchema] = useState({ fieldSchema: getPropertySchemaForFormat(props?.format) });
  const handleValueChanged = useCallback(
    (_props: PropertyType) => {
      // Update schema if format changed.
      // TODO(burdon): Callback should pass `changed` to indicate which fields have changed.
      if (_props.format !== props.format) {
        setFieldSchema({ fieldSchema: getPropertySchemaForFormat(_props.format) });
      }
      setProps((props) => {
        const type = formatToType[_props.format as keyof typeof formatToType];
        if (props.type !== type) {
          return { ...props, ..._props, type };
        }
        return props;
      });
    },
    [props],
  );

  const handleValidate = useCallback(
    ({ property }: PropertyType) => {
      if (property && view.fields.find((f) => f.property === property && f.property !== field.property)) {
        return [{ path: 'property', message: `'${property}' is not unique.` }];
      }
    },
    [view.fields, field],
  );

  const handleSave = useCallback(
    (props: PropertyType) => {
      projection.setFieldProjection({ field, props });
      onClose();
    },
    [projection, field, onClose],
  );

  if (!fieldSchema) {
    log.warn('invalid format', props);
    return null;
  }

  return (
    <Form<PropertyType>
      key={field.property}
      autoFocus
      values={props}
      schema={fieldSchema}
      filter={(props) => props.filter((p) => p.property !== 'type')}
      sort={['property', 'format']}
      onValuesChanged={handleValueChanged}
      onValidate={handleValidate}
      onSave={handleSave}
      onCancel={onClose}
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
            options={
              [
                // TODO(burdon): Query.
                // { value: 'example.com/type/A' },
                // { value: 'example.com/type/B' },
                // { value: 'example.com/type/C' },
              ]
            }
          />
        ),
        referenceProperty: (props) => (
          <FormInput<PropertyType>
            {...props}
            options={
              [
                // TODO(burdon): Query.
                // { value: 'prop-1' },
                // { value: 'prop-2' },
                // { value: 'prop-3' },
              ]
            }
          />
        ),
      }}
    />
  );
};
