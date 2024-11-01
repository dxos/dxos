//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode, useMemo } from 'react';

import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { FieldKindEnums, type FieldPropertiesType, type FieldType, type ViewType } from '@dxos/schema';

import { useForm } from '../../hooks';
import { translationKey } from '../../translations';
import { pathNotUniqueError, typeFeatures } from '../../util';

export type FieldProps = ThemedClassName<{
  view: ViewType;
  field: FieldType;
  autoFocus?: boolean;
  readonly?: boolean;
  onSave?: (field: FieldType) => void;
}>;

export const Field = ({ classNames, view, field, autoFocus, readonly, onSave }: FieldProps) => {
  const { t } = useTranslation(translationKey);

  const { values, getInputProps, errors, touched, canSubmit, handleSubmit } = useForm<FieldPropertiesType>({
    // TODO(burdon): Caller should pass in the value (and clone if necessary).
    initialValues: { ...field } as FieldPropertiesType,
    additionalValidation: (values) => {
      // Check that the path doesn't already exist in the schema.
      const pathChanged = values.path !== field.path;
      if (pathChanged && view.schema && (view.schema as any).properties[values.path]) {
        return [pathNotUniqueError(values.path)];
      }
    },
    onSubmit: (values: FieldPropertiesType) => {
      // TODO(ZaymonFC):
      // Values is a validated instance of FormSchema.

      // If path, visible, width change, update the field.
      // If label / type / digits / ref schema / ref property changes, update view.schema

      onSave?.(field);
      // TODO(ZaymonFC): Update the associated schema type here if changed.
      // What's the nicest way to do this? Why do we store the type in field at all?
    },
  });

  const features = useMemo(() => typeFeatures[values.format] ?? [], [values.format]);

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
                  {FieldKindEnums.map((type) => (
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

const FieldRow = ({ children }: { children: ReactNode }) => {
  return <div className='flex flex-col w-full gap-1'>{children}</div>;
};
