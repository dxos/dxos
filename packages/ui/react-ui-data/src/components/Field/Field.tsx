//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { FormatEnums, type S, type FormatEnum } from '@dxos/echo-schema';
import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { getProperties, type Property } from '@dxos/schema';

import { type FormResult, useForm } from '../../hooks';
import { translationKey } from '../../translations';

// TODO(burdon): Factor out.
// TODO(burdon): Separate story.
export type FieldInputProps<T extends S.Schema.Type<any>, V = string | number> = {
  property: keyof T;
  label: string;
  options?: Array<{ value: V; label: string }>;
  disabled?: boolean;
  placeholder?: string;
  getInputProps: (field: keyof T, type?: 'select') => Record<string, any>;
} & Pick<FormResult<T>, 'getErrorValence' | 'getErrorMessage'>;

export const FieldInput = <T extends S.Schema.Type<any>, V = string | number>({
  property,
  label,
  options = [],
  disabled,
  placeholder,
  getInputProps,
  getErrorValence,
  getErrorMessage,
}: FieldInputProps<T, V>) => {
  const validationValence = getErrorValence(property);
  const errorMessage = getErrorMessage(property);

<<<<<<< HEAD
  if (options) {
    return (
      <Input.Root validationValence={validationValence}>
        <Input.Label>{label}</Input.Label>
        <Select.Root {...getInputProps(property, 'select')}>
          <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {options.map(({ value, label }) => (
                  <Select.Option key={String(value)} value={String(value)}>
                    {label}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <Input.DescriptionAndValidation>
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  } else {
=======
  switch (type) {
    // TODO(burdon): Restrict string pattern. Input masking based on schema?
    case 'string': {
      return (
        <Input.Root validationValence={validationValence}>
          <Input.Label>{label}</Input.Label>
          <Input.DescriptionAndValidation>
            <Input.TextInput type='string' disabled={disabled} placeholder={placeholder} {...getInputProps(property)} />
            <Input.Validation>{errorMessage}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      );
    }

>>>>>>> a9d60ae80fab8d142315437142eace4f4fc4b183
    // TODO(burdon): Restrict number.
    // TODO(burdon): Restrict string pattern.
    // TODO(burdon): Checkbox.
    return (
      <Input.Root validationValence={validationValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Input.TextInput type='string' disabled={disabled} placeholder={placeholder} {...getInputProps(property)} />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }
};

//
// Field
//

export type FieldProps<T extends S.Schema.Type<any>> = ThemedClassName<{
  field: T; // TODO(burdon): Rename value.
  schema: S.Schema<any>;
  autoFocus?: boolean;
  readonly?: boolean;
  // TODO(burdon): Property should be generic.
  onValuesChanged?: (values: T) => void;
  onSave?: (field: T) => void;
}>;

// TODO(burdon): Rename/reconcile with Form.
// TODO(burdon): Remove extends Property.
export const Field = <T extends Property>({
  classNames,
  field,
  schema,
  readonly,
  onValuesChanged,
  onSave,
}: FieldProps<T>) => {
  const { t } = useTranslation(translationKey);

  // TODO(burdon): Type for useForm.
  const { getInputProps, canSubmit, handleSubmit, getErrorValence, getErrorMessage } = useForm<T>({
    schema,
    initialValues: field,
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
      <FieldInput<T, FormatEnum>
        property='format'
        label={t('field type label')}
        options={FormatEnums.map((type) => ({ value: type, label: t(`field type ${type}`) }))}
        disabled={readonly}
        placeholder='Type'
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
      />

      {props.map(({ name }) => (
        <FieldInput<T>
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
