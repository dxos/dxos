//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  const props = useMemo<PropertyType>(() => {
    const { props } = projection.getFieldProjection(field.property);
    return props;
  }, [field, projection]);

  const [{ fieldSchema }, setSchema] = useState({
    fieldSchema: getPropertySchemaForFormat(props?.format),
  });

  // TODO(burdon): Determine what has changed.
  // TODO(burdon): Update object type (field) when format changes (get from FormatSchema map).
  const handleValueChanged = useCallback((_props: PropertyType) => {
    const fieldSchema = getPropertySchemaForFormat(_props.format);
    props.type = formatToType[props.format as FormatEnum]; // TODO(burdon): Why is type any?
    setSchema({ fieldSchema });
  }, []);

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
    return <div>Schema not implemented for {props?.format ?? 'undefined'}</div>;
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
