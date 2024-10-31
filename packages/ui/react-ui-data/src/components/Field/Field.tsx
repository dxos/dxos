//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getProperty, type S } from '@dxos/effect';
import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type FieldType, FieldValueTypes, FieldSchema } from '@dxos/schema';

import { useForm } from '../../hooks';
import { translationKey } from '../../translations';
import { pathNotUniqueError, typeFeatures } from '../../util';

const FieldRow = ({ children }: { children: React.ReactNode }) => {
  return <div className='flex flex-col w-full gap-1'>{children}</div>;
};

export type FieldProps<T = {}> = ThemedClassName<{
  field: FieldType;
  schema?: S.Schema<T>;
  autoFocus?: boolean;
  readonly?: boolean;
  onSave?: (field: FieldType) => void;
}>;

export const Field = <T = {},>({ classNames, field, autoFocus, readonly, schema, onSave }: FieldProps<T>) => {
  const { t } = useTranslation(translationKey);
  const { values, getInputProps, errors, handleSubmit, canSubmit, touched } = useForm({
    initialValues: { ...field },
    schema: FieldSchema,
    additionalValidation: (values) => {
      if (schema && values.path !== field.path && getProperty(schema, values.path)) {
        return [pathNotUniqueError(values.path)];
      }
    },
    onSubmit: (values) => {
      // For object keys in values, set that value on field.
      // TODO(ZaymonFC): Is there a nicer way to do this?
      (Object.keys(values) as Array<keyof typeof values>).forEach((key) => {
        field[key] = values[key];
      });

      onSave?.(field);
      // TODO(ZaymonFC): Update the associated schema type here if changed.
      // What's the nicest way to do this? Why do we store the type in field at all?
    },
  });

  const features = React.useMemo(() => typeFeatures[values.type] ?? [], [values.type]);

  return (
    <div className={mx('flex flex-col w-full gap-1 p-2', classNames)}>
      <FieldRow>
        <Input.Root validationValence={touched.path && errors.path ? 'error' : undefined}>
          <Input.Label>{t('field path label')}</Input.Label>
          <Input.TextInput
            autoFocus={autoFocus}
            disabled={readonly}
            placeholder={t('field path placeholder')}
            {...getInputProps('path')}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{touched.path && errors.path}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>

      <FieldRow>
        <Input.Root validationValence={touched.label && errors.label ? 'error' : undefined}>
          <Input.Label>{t('field label label')}</Input.Label>
          <Input.TextInput disabled={readonly} placeholder={t('field label placeholder')} {...getInputProps('label')} />
          <Input.DescriptionAndValidation>
            <Input.Validation>{touched.label && errors.label}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>

      <FieldRow>
        <Input.Root validationValence={touched.type && errors.type ? 'error' : undefined}>
          <Input.Label>{t('field type label')}</Input.Label>
          <Select.Root {...getInputProps('type')}>
            <Select.TriggerButton classNames='is-full' placeholder='Type' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {FieldValueTypes.map((type) => (
                    <Select.Option key={type} value={type}>
                      {t(`field type ${type}`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Input.DescriptionAndValidation>
            <Input.Validation>{touched.type && errors.type}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>

      {features.includes('numeric') && (
        <FieldRow>
          <Input.Root validationValence={touched.digits && errors.digits ? 'error' : undefined}>
            <Input.Label>{t('field digits label')}</Input.Label>
            <Input.TextInput disabled={readonly} type='number' {...getInputProps('digits')} />
            <Input.DescriptionAndValidation classNames='min-bs-[1em]'>
              <Input.Validation>{touched.digits && errors.digits}</Input.Validation>
            </Input.DescriptionAndValidation>
          </Input.Root>
        </FieldRow>
      )}

      {/* {features.includes('ref') && (
        <>
          <FieldRow>
            <Input.Root validationValence={touched.refSchema && errors.refSchema ? 'error' : undefined}>
              <Input.Label>{t('field ref schema label')}</Input.Label>
              <Input.TextInput disabled={readonly} {...getInputProps('refSchema')} />
              <Input.DescriptionAndValidation>
                <Input.Validation>{touched.refSchema && errors.refSchema}</Input.Validation>
              </Input.DescriptionAndValidation>
            </Input.Root>
          </FieldRow>
          <FieldRow>
            <Input.Root validationValence={touched.refProperty && errors.refProperty ? 'error' : undefined}>
              <Input.Label>{t('field ref property label')}</Input.Label>
              <Input.TextInput disabled={readonly} {...getInputProps('refProperty')} />
              <Input.DescriptionAndValidation>
                <Input.Validation>{touched.refProperty && errors.refProperty}</Input.Validation>
              </Input.DescriptionAndValidation>
            </Input.Root>
          </FieldRow>
        </>
      )} */}

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
