//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type S } from '@dxos/echo-schema';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getSchemaProperties } from '@dxos/schema';

import { FormInput, type FormInputProps } from './FormInput';
import { useForm } from '../../hooks';

export type FormProps<T extends object> = ThemedClassName<{
  values: T;
  schema: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
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
  onValuesChanged,
  onSave,
  Custom,
}: FormProps<T>) => {
  // TODO(burdon): Type for useForm.
  const { getInputProps, canSubmit, handleSubmit, getErrorValence, getErrorMessage } = useForm<T>({
    schema,
    initialValues: values,
    // additionalValidation: (values) => {
    // Check that the path doesn't already exist in the schema.
    // TODO(ZaymonFC) Need to use some sort of json path accessor to check paths like:
    // 'address.zip'.
    // This should be a util.
    // const pathChanged = values.property !== field.property;
    // if (pathChanged && view.schema && (view.schema as any).properties[values.property]) {
    //   return [pathNotUniqueError(values.property)];
    // }
    // },
    onValuesChanged,
    onSubmit: (values) => onSave?.(values),
  });

  // TODO(burdon): Create schema annotation for order or pass in params?
  const props = getSchemaProperties<T>(schema);

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
      {props.map(({ name, label }) => (
        <div key={name} role='none'>
          <FormInput<T>
            property={name}
            label={label ?? name}
            disabled={readonly}
            getInputProps={getInputProps}
            getErrorValence={getErrorValence}
            getErrorMessage={getErrorMessage}
          />
        </div>
      ))}

      {/* {features.includes('ref') && (
        <>
          <FieldRow>
            <Input.Root validationValence={getErrorValence('refSchema')}>
              <Input.Label>{t('field ref schema label')}</Input.Label>
              <Input.TextInput disabled={readonly} {...getInputProps('refSchema')} />
              <Input.DescriptionAndValidation>
                <Input.Validation>{getErrorMessage('refSchema')}</Input.Validation>
              </Input.DescriptionAndValidation>
            </Input.Root>
          </FieldRow>
          <FieldRow>
            <Input.Root validationValence={getErrorValence('refProperty')}>
              <Input.Label>{t('field ref property label')}</Input.Label>
              <Input.TextInput disabled={readonly} {...getInputProps('refProperty')} />
              <Input.DescriptionAndValidation>
                <Input.Validation>{getErrorMessage('refProperty')}</Input.Validation>
              </Input.DescriptionAndValidation>
            </Input.Root>
          </FieldRow>
        </>
      )}
      */}

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
