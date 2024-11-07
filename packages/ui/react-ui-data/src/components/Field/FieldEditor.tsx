//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { FormatEnum, FormatEnums, formatToType } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import {
  getPropertySchemaForFormat,
  type FieldProjection,
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
        const type = formatToType[_props.format as FormatEnum]; // TODO(burdon): Why is cast needed?
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
    (props: FieldProjection) => {
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
      additionalValidation={handleAdditionalValidation}
      onValuesChanged={handleValueChanged}
      onSave={handleSet}
      onCancel={onComplete}
      Custom={(props) => (
        <>
          {/* TODO(burdon): Move property field here. */}
          <FormInput<PropertyType>
            property='format'
            label={t('field format label')}
            placeholder={t('field format label')}
            options={FormatEnums.filter((value) => value !== FormatEnum.None).map((value) => ({
              value,
              label: t(`format ${value}`),
            }))}
            {...props}
          />
        </>
      )}
    />
  );
};
