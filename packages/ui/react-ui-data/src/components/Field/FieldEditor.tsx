//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FormatEnum, FormatEnums } from '@dxos/echo-schema';
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
}: {
  field: FieldType;
  projection: ViewProjection;
  view: ViewType;
}) => {
  const { t } = useTranslation(translationKey);
  const fieldProperties = useMemo<PropertyType>(() => {
    const { props } = projection.getFieldProjection(field.property);
    return props;
  }, [field, projection]);

  const [{ fieldSchema }, setSchema] = useState({
    fieldSchema: getPropertySchemaForFormat(fieldProperties?.format),
  });

  // TODO(burdon): Update object type (field) when format changes (get from FormatSchema map).
  // TODO(burdon): Handle changes to `property` (e.g., uniqueness)?
  const handleValueChanged = useCallback((values: PropertyType) => {
    setSchema({ fieldSchema: getPropertySchemaForFormat(values?.format) });
  }, []);

  useEffect(() => {
    handleValueChanged(fieldProperties);
  }, [fieldProperties]);

  const handleAdditionalValidation = useCallback(
    ({ property }: PropertyType) => {
      if (property && view.fields.find((f) => f.property === property && f.property !== field.property)) {
        return [{ path: 'property', message: `'${property}' is not unique.` }];
      }
    },
    [view.fields, field],
  );

  const handleSet = useCallback(
    (props: FieldProjection) => projection.setFieldProjection({ field, props }),
    [projection, field],
  );

  if (!fieldSchema) {
    return <div>Schema not implemented for {fieldProperties?.format ?? 'undefined'}</div>;
  }

  return (
    <Form<PropertyType>
      key={field.property}
      autoFocus
      values={fieldProperties}
      schema={fieldSchema}
      additionalValidation={handleAdditionalValidation}
      onValuesChanged={handleValueChanged}
      onSave={handleSet}
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
