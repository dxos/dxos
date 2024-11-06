//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/echo-schema';
import { Button, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getProperties } from '@dxos/schema';

import { FormInput } from './FormInput';
import { useForm } from '../../hooks';
import { translationKey } from '../../translations';

export type FieldProps<T extends object> = ThemedClassName<{
  values: T;
  schema: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
  // TODO(burdon): Property should be generic.
  onValuesChanged?: (values: T) => void;
  onSave?: (values: T) => void;
}>;

// TODO(burdon): Remove extends Property.
// TODO(burdon): Rename/reconcile with Form.
export const Field = <T extends object>({
  classNames,
  values,
  schema,
  readonly,
  onValuesChanged,
  onSave,
}: FieldProps<T>) => {
  const { t } = useTranslation(translationKey);

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

  // TODO(ZaymonFC): Generate based off of schema.
  // TODO(burdon): Type literals are skipped and should be handled explicitely.
  const props = getProperties<T>(schema);

  return (
    <div className={mx('flex flex-col w-full gap-1 p-2', classNames)}>
      {/* <FormInput<T> */}
      {/*  property='format' */}
      {/*  label={t('field type label')} */}
      {/*  options={FormatEnums.map((type) => ({ value: type, label: t(`field type ${type}`) }))} */}
      {/*  disabled={readonly} */}
      {/*  placeholder='Type' */}
      {/*  getInputProps={getInputProps} */}
      {/*  getErrorValence={getErrorValence} */}
      {/*  getErrorMessage={getErrorMessage} */}
      {/* /> */}

      {props.map(({ name }) => (
        <FormInput<T>
          key={name}
          property={name}
          label={name}
          disabled={readonly}
          // placeholder={t('field multipleOf placeholder')}
          getInputProps={getInputProps}
          getErrorValence={getErrorValence}
          getErrorMessage={getErrorMessage}
        />
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

      {!readonly && (
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {t('field save button label')}
        </Button>
      )}
    </div>
  );
};
