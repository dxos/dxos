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

type SchemaInputProps<T extends object> = {
  getInputProps: (field: keyof T, type?: 'select') => Record<string, any>;
  getErrorValence: FormResult<T>['getErrorValence'];
  getErrorMessage: FormResult<T>['getErrorMessage'];
  fieldName: keyof T;
  label: string;
  type: 'string' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  placeholder?: string;
};

export const FieldInput = <T extends object>({
  getInputProps,
  getErrorValence,
  getErrorMessage,
  fieldName,
  label,
  type,
  options = [],
  disabled,
  placeholder,
}: SchemaInputProps<T>) => {
  return (
    <Input.Root validationValence={getErrorValence(fieldName)}>
      <Input.Label>{label}</Input.Label>
      {type === 'select' ? (
        <Select.Root {...getInputProps(fieldName, 'select')}>
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
      ) : (
        <Input.TextInput type={type} disabled={disabled} placeholder={placeholder} {...getInputProps(fieldName)} />
      )}
      <Input.DescriptionAndValidation>
        <Input.Validation>{getErrorMessage(fieldName)}</Input.Validation>
      </Input.DescriptionAndValidation>
    </Input.Root>
  );
};

//
// Field
//

export type FieldProps = ThemedClassName<{
  field: Property;
  schema: S.Schema<any>;
  autoFocus?: boolean;
  readonly?: boolean;
  onSave?: (field: FieldProjectionType) => void;
}>;

export const Field = ({ classNames, field, schema, autoFocus, readonly, onSave }: FieldProps) => {
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
    onSubmit: (values) => onSave?.(values),
  });

  const astProps = AST.getPropertySignatures(schema.ast);

  // TODO(ZaymonFC): How can we generate the following based on the effect schema given to us?
  return (
    <div className={mx('flex flex-col w-full gap-1 p-2', classNames)}>
      <FieldInput<Property>
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
        fieldName='property'
        label={t('field path label')}
        type='string'
        disabled={readonly}
        placeholder={t('field path placeholder')}
      />
      <FieldInput<Property>
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
        fieldName='title'
        label={t('field label label')}
        type='string'
        disabled={readonly}
        placeholder={t('field label placeholder')}
      />
      <FieldInput<Property>
        getInputProps={getInputProps}
        getErrorValence={getErrorValence}
        getErrorMessage={getErrorMessage}
        fieldName='format'
        label={t('field type label')}
        type='select'
        options={FormatEnums.map((type) => ({ value: type, label: t(`field type ${type}`) }))}
        disabled={readonly}
        placeholder='Type'
      />

      {astProps.findIndex((prop) => prop.name === 'multipleOf') !== -1 && (
        <FieldInput<any>
          getInputProps={getInputProps}
          getErrorValence={getErrorValence}
          getErrorMessage={getErrorMessage}
          fieldName='multipleOf'
          label={t('field multipleOf label')}
          type='number'
          disabled={readonly}
          placeholder={t('field multipleOf placeholder')}
        />
      )}

      {astProps.findIndex((prop) => prop.name === 'currency') !== -1 && (
        <FieldInput<any>
          getInputProps={getInputProps}
          getErrorValence={getErrorValence}
          getErrorMessage={getErrorMessage}
          fieldName='currency'
          label={t('field currency label')}
          type='string'
          disabled={readonly}
          placeholder={t('field currency placeholder')}
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
