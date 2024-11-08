//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  const fieldSchema = useMemo(() => getPropertySchemaForFormat(props?.format), [props?.format]);

  const handleValueChanged = useCallback((_props: PropertyType) => {
    // Update schema if format changed.
    // TODO(burdon): Callback should pass `changed` to indicate which fields have changed.
    setProps((props) => {
      const type = formatToType[_props.format as keyof typeof formatToType];
      if (props.type === type) {
        return props;
      }
      return { ...props, ..._props, type };
    });
  }, []);

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
