//
// Copyright 2024 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
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
  additionalValidation?: (values: T) => ValidationError[] | undefined;
  onValuesChanged?: (values: T) => void;
  onSave?: (values: T) => void;
  Custom?: FC<Omit<FormInputProps<T>, 'property' | 'label'>>;
}>;

/**
 * General purpose form control that generates properties based on the schema.
 */
export const Form = <T extends object>({
  classNames,
  values,
  schema,
  readonly,
  additionalValidation,
  onValuesChanged,
  onSave,
  Custom,
}: FormProps<T>) => {
  // TODO(burdon): Type for useForm.
  const { canSubmit, handleSubmit, getInputProps, getErrorValence, getErrorMessage } = useForm<T>({
    schema,
    initialValues: values,
    additionalValidation,
    onValuesChanged,
    onSubmit: (values) => onSave?.(values),
  });

  // TODO(burdon): Create schema annotation for order or pass in params?
  // TODO(ZaymonFC): We might need to use a variant of `getSchemaProperties` that uses the
  // `from` type instead of `to` type for transformations since we are expecting the pre-encoded
  // form as input from the user.
  const props = useMemo(() => getSchemaProperties<T>(schema), [schema]);

  return (
    <div className={mx('flex flex-col w-full gap-2 p-2', classNames)}>
      {/* Custom fields. */}
      {Custom && (
        <div role='none'>
          <Custom
            disabled={readonly}
            getInputProps={getInputProps}
            getErrorValence={getErrorValence}
            getErrorMessage={getErrorMessage}
          />
        </div>
      )}

      {/* Generated fields. */}
      {props.map(({ name, label, type }) => (
        <div key={name} role='none'>
          <FormInput<T>
            property={name}
            label={label ?? name}
            disabled={readonly}
            getInputProps={getInputProps}
            getErrorValence={getErrorValence}
            getErrorMessage={getErrorMessage}
            type={type === 'number' ? 'number' : undefined}
          />
        </div>
      ))}

      {/* TODO(burdon): Option. */}
      {!readonly && (
        <div className='flex w-full justify-center'>
          <div className='flex gap-2'>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Icon icon='ph--check--regular' />
            </Button>
            <Button disabled={!canSubmit}>
              <Icon icon='ph--x--regular' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
