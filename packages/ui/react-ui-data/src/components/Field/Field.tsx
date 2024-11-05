//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode, useMemo } from 'react';

import { FormatEnums } from '@dxos/echo-schema';
import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type FieldProjectionType, FieldProjectionSchema } from '@dxos/schema';

import { useForm } from '../../hooks';
import { translationKey } from '../../translations';
import { typeFeatures } from '../../util';

export type FieldProps = ThemedClassName<{
  field: FieldProjectionType;
  autoFocus?: boolean;
  readonly?: boolean;
  onSave?: (field: FieldProjectionType) => void;
}>;

export const Field = ({ classNames, field, autoFocus, readonly, onSave }: FieldProps) => {
  const { t } = useTranslation(translationKey);

  const { values, getInputProps, errors, touched, canSubmit, handleSubmit } = useForm<FieldProjectionType>({
    schema: FieldProjectionSchema,
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

  // TODO(burdon): ???
  const features = useMemo(() => (values.format ? typeFeatures[values.format] ?? [] : []), [values.format]);

  return (
    <div className={mx('flex flex-col w-full gap-1 p-2', classNames)}>
      <FieldRow>
        <Input.Root validationValence={touched.property && errors.property ? 'error' : undefined}>
          <Input.Label>{t('field path label')}</Input.Label>
          <Input.TextInput
            autoFocus={autoFocus}
            disabled={readonly}
            placeholder={t('field path placeholder')}
            {...getInputProps('property')}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{touched.property && errors.property}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>
      <FieldRow>
        <Input.Root validationValence={touched.title && errors.title ? 'error' : undefined}>
          <Input.Label>{t('field label label')}</Input.Label>
          <Input.TextInput disabled={readonly} placeholder={t('field label placeholder')} {...getInputProps('title')} />
          <Input.DescriptionAndValidation>
            <Input.Validation>{touched.title && errors.title}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>
      <FieldRow>
        <Input.Root validationValence={touched.format && errors.format ? 'error' : undefined}>
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
            <Input.Validation>{touched.format && errors.format}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </FieldRow>

      {/* TODO(burdon): Convert multipleOf. */}
      {/*
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
      */}
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
