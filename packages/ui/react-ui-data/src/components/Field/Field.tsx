//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';

import { FormatEnums, type S } from '@dxos/echo-schema';
import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type FieldProjectionType, type Property } from '@dxos/schema';

import { useForm } from '../../hooks';
import { translationKey } from '../../translations';

//
// Util (move once stable)
//

// const errorValence = (

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

  const { getInputProps, canSubmit, handleSubmit, getErrorValence, getErrorMessage } = useForm<Property>({
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

  return (
    <div className={mx('flex flex-col w-full gap-1 p-2', classNames)}>
      <FieldRow>
        <Input.Root validationValence={getErrorValence('property')}>
          <Input.Label>{t('field path label')}</Input.Label>
          <Input.TextInput
            autoFocus={autoFocus}
            disabled={readonly}
            placeholder={t('field path placeholder')}
            {...getInputProps('property')}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{getErrorMessage('property')}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>
      <FieldRow>
        <Input.Root validationValence={getErrorValence('title')}>
          <Input.Label>{t('field label label')}</Input.Label>
          <Input.TextInput disabled={readonly} placeholder={t('field label placeholder')} {...getInputProps('title')} />
          <Input.DescriptionAndValidation>
            <Input.Validation>{getErrorMessage('title')}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>
      <FieldRow>
        <Input.Root validationValence={getErrorValence('format')}>
          <Input.Label>{t('field type label')}</Input.Label>
          <Select.Root {...getInputProps('format', 'select')}>
            <Select.TriggerButton classNames='is-full' placeholder='Type' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {FormatEnums.map((type) => (
                    <Select.Option key={type} value={type}>
                      {t(`field type ${type}`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Input.DescriptionAndValidation>
            <Input.Validation>{getErrorMessage('format')}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>

      {/* TODO(burdon): Convert multipleOf. */}
      {/*
      {features.includes('numeric') && (
        <FieldRow>
          <Input.Root validationValence={getErrorValence('digits')}>
            <Input.Label>{t('field digits label')}</Input.Label>
            <Input.TextInput disabled={readonly} type='number' {...getInputProps('digits')} />
            <Input.DescriptionAndValidation classNames='min-bs-[1em]'>
              <Input.Validation>{getErrorMessage('digits')}</Input.Validation>
            </Input.DescriptionAndValidation>
          </Input.Root>
        </FieldRow>
      )}
      */}
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
        <FieldRow>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {t('field save button label')}
          </Button>
        </FieldRow>
      )}
    </div>
  );
};

const FieldRow = ({ children }: { children: ReactNode }) => {
  return <div className='flex flex-col w-full gap-1'>{children}</div>;
};
