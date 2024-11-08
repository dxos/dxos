//
// Copyright 2024 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties, type ValidationError } from '@dxos/schema';

import { FormInput, type FormInputProps } from './FormInput';
import { useForm } from '../../hooks';

export type FormProps<T extends object> = ThemedClassName<{
  values: T;
  schema: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
  order?: (keyof T)[];
  additionalValidation?: (values: T) => ValidationError[] | undefined;
  onValuesChanged?: (values: T) => void;
  onSave?: (values: T) => void;
  onCancel?: () => void;
  Custom?: Partial<Record<keyof T, FC<FormInputProps<T>>>>;
}>;

/**
 * General purpose form control that generates properties based on the schema.
 */
export const Form = <T extends object>({
  classNames,
  values,
  schema,
  readonly,
  order = [],
  additionalValidation,
  onValuesChanged,
  onSave,
  onCancel,
  Custom,
}: FormProps<T>) => {
  const { canSubmit, errors, handleSubmit, getInputProps, getErrorValence, getErrorMessage } = useForm<T>({
    schema,
    initialValues: values,
    additionalValidation,
    onValuesChanged,
    onSubmit: (values) => onSave?.(values),
  });

  if (errors && Object.keys(errors).length) {
    log.warn('validation', { errors });
  }

  // TODO(burdon): Sort.
  const props = useMemo(() => {
    const props = getSchemaProperties<T>(schema);
    return props;
  }, [schema, order]);

  return (
    <div className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      {/* Generated fields. */}
      {props.map(({ property, type, title }) => {
        const PropertyInput = Custom?.[property] ?? FormInput<T>;
        return (
          <div key={property} role='none'>
            <PropertyInput
              property={property}
              type={type === 'number' ? 'number' : undefined}
              label={title ?? property}
              disabled={readonly}
              getInputProps={getInputProps}
              getErrorValence={getErrorValence}
              getErrorMessage={getErrorMessage}
            />
          </div>
        );
      })}

      {/* TODO(burdon): Option. */}
      {!readonly && (
        <div className='flex w-full justify-center'>
          <div className='flex gap-2'>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Icon icon='ph--check--regular' />
            </Button>
            <Button onClick={onCancel}>
              <Icon icon='ph--x--regular' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
