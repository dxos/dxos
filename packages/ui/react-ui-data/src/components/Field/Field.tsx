//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, FormatEnums, type S } from '@dxos/echo-schema';
import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type FieldProjectionType, type Property } from '@dxos/schema';

import { type FormResult, useForm } from '../../hooks';
import { translationKey } from '../../translations';

//
// Util (move once stable)
//

// TODO(burdon): Does this need to be generic?
export type FieldInputProps<T extends object> = {
  property: keyof T;
  type: 'string' | 'number' | 'select'; // TODO(burdon): Use type.
  label: string;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  placeholder?: string;
  getInputProps: (field: keyof T, type?: 'select') => Record<string, any>;
} & Pick<FormResult<T>, 'getErrorValence' | 'getErrorMessage'>;

export const FieldInput = <T extends object>({
  property,
  type,
  label,
  options = [],
  disabled,
  placeholder,
  getInputProps,
  getErrorValence,
  getErrorMessage,
}: FieldInputProps<T>) => {
  const validationValence = getErrorValence(property);
  const errorMessage = getErrorMessage(property);

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

    // TODO(burdon): Restrict number.
    case 'number': {
      return <div>Not implemented</div>;
    }

    case 'select': {
      return (
        <Input.Root validationValence={validationValence}>
          <Input.Label>{label}</Input.Label>
          <Select.Root {...getInputProps(property, 'select')}>
            <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {options.map(({ value, label }) => (
                    <Select.Option key={value} value={value}>
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
    }
  }
};

//
// Field
//

export type FieldProps = ThemedClassName<{
  field: Property;
  schema: S.Schema<any>;
  autoFocus?: boolean;
  readonly?: boolean;
  onValuesChanged?: (values: Property) => void;
  onSave?: (field: FieldProjectionType) => void;
}>;

export const Field = ({ classNames, field, schema, readonly, onValuesChanged, onSave }: FieldProps) => {
  const { t } = useTranslation(translationKey);

  const { getInputProps, canSubmit, handleSubmit, getErrorValence, getErrorMessage } = useForm<any>({
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

  const astProps = AST.getPropertySignatures(schema.ast);

  // TODO(ZaymonFC): How can we generate the following based on the effect schema given to us?
  return (
    <div className={mx('flex flex-col w-full gap-1 p-2', classNames)}>
      <FieldInput<Property>
        property='property'
        label={t('field path label')}
        type='string'
        disabled={readonly}
        placeholder={t('field path placeholder')}
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
      />

      <FieldInput<Property>
        property='title'
        label={t('field label label')}
        type='string'
        disabled={readonly}
        placeholder={t('field label placeholder')}
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
      />

      <FieldInput<Property>
        property='format'
        label={t('field type label')}
        type='select'
        options={FormatEnums.map((type) => ({ value: type, label: t(`field type ${type}`) }))}
        disabled={readonly}
        placeholder='Type'
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
      />

      {astProps.findIndex((prop) => prop.name === 'multipleOf') !== -1 && (
        <FieldInput<any>
          property='multipleOf'
          label={t('field multipleOf label')}
          type='number'
          disabled={readonly}
          placeholder={t('field multipleOf placeholder')}
          getInputProps={getInputProps}
          getErrorValence={getErrorValence}
          getErrorMessage={getErrorMessage}
        />
      )}

      {astProps.findIndex((prop) => prop.name === 'currency') !== -1 && (
        <FieldInput<any>
          property='currency'
          label={t('field currency label')}
          type='string'
          disabled={readonly}
          placeholder={t('field currency placeholder')}
          getInputProps={getInputProps}
          getErrorValence={getErrorValence}
          getErrorMessage={getErrorMessage}
        />
      )}

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
