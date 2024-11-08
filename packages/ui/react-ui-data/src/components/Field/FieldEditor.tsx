//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { FormatEnum, FormatEnums, formatToType } from '@dxos/echo-schema';
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

export const FieldEditor = ({
  field,
  projection,
  view,
  onComplete,
}: {
  field: FieldType;
  projection: ViewProjection;
  view: ViewType;
  onComplete: () => void;
}) => {
  const { t } = useTranslation(translationKey);
  const [props, setProps] = useState<PropertyType>(projection.getFieldProjection(field.property).props);
  useEffect(() => {
    const { props } = projection.getFieldProjection(field.property);
    setProps(props);
  }, [field, projection]);

  // TODO(burdon): Need to wrap otherwise throws error:
  //  Class constructor SchemaClass cannot be invoked without 'new'
  const [{ fieldSchema }, setSchema] = useState({ fieldSchema: getPropertySchemaForFormat(props?.format) });
  const handleValueChanged = useCallback(
    (_props: PropertyType) => {
      // Update schema if format changed.
      // TODO(burdon): Callback should pass `touched` to indicate which fields have changed.
      if (props.format !== _props.format) {
        const fieldSchema = getPropertySchemaForFormat(_props.format);
        setSchema({ fieldSchema });
        const type = formatToType[_props.format];
        setProps({ ...props, ..._props, type });
      }
    },
    [props],
  );

  useEffect(() => {
    handleValueChanged(props);
  }, [props]);

  const handleAdditionalValidation = useCallback(
    ({ property }: PropertyType) => {
      if (property && view.fields.find((f) => f.property === property && f.property !== field.property)) {
        return [{ path: 'property', message: `'${property}' is not unique.` }];
      }
    },
    [view.fields, field],
  );

  const handleSet = useCallback(
    (props: PropertyType) => {
      projection.setFieldProjection({ field, props });
      onComplete();
    },
    [projection, field, onComplete],
  );

  if (!fieldSchema) {
    return <div>Invalid format: {props?.format}</div>;
  }

  return (
    <Form<PropertyType>
      key={field.property}
      autoFocus
      values={props}
      schema={fieldSchema}
      order={['property', 'format']}
      additionalValidation={handleAdditionalValidation}
      onValuesChanged={handleValueChanged}
      onSave={handleSet}
      onCancel={onComplete}
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
      }}
    />
  );
};
