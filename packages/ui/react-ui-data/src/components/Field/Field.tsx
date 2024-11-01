//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/effect';
import { Button, Input, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { FieldKindEnums, type FieldType, type ViewType } from '@dxos/schema';

import { useForm } from '../../hooks';
import { translationKey } from '../../translations';
import { pathNotUniqueError, typeFeatures } from '../../util';

const FieldRow = ({ children }: { children: React.ReactNode }) => {
  return <div className='flex flex-col w-full gap-1'>{children}</div>;
};

export type FieldProps = ThemedClassName<{
  view: ViewType;
  field: FieldType;
  autoFocus?: boolean;
  readonly?: boolean;
  onSave?: (field: FieldType) => void;
}>;

// TODO(ZaymonFC): This is a composite, but we need to build up a description of everything this form might
// handle. Maybe we'll compose this too.
//
// Basic form schema requirements.
// Source validations from annotations / .... somewhere?
const FormSchema = S.mutable(
  S.Struct({
    // TODO(ZaymonFC): Reconcile this with a source of truth for these refinements.
    path: S.String.pipe(
      S.nonEmptyString({ message: () => 'Property is required.' }),
      S.pattern(/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/, { message: () => 'Invalid property path.' }),
    ),
    label: S.optional(S.String),
    type: S.String,
    digits: S.optional(S.Number.pipe(S.int(), S.nonNegative())),
    refSchema: S.optional(S.String),
    refProperty: S.optional(S.String),
  }),
);

type FormType = S.Schema.Type<typeof FormSchema>;

export const Field = ({ classNames, view, field, autoFocus, readonly, onSave }: FieldProps) => {
  const { t } = useTranslation(translationKey);

  const { values, getInputProps, errors, handleSubmit, canSubmit, touched } = useForm({
    initialValues: { ...field } as FormType,
    // schema: FieldSchema,
    additionalValidation: (values) => {
      // Check that the path doesn't already exist in the schema.
      const pathChanged = values.path !== field.path;
      if (pathChanged && view.schema && (view.schema as any).properties[values.path]) {
        return [pathNotUniqueError(values.path)];
      }
    },
    onSubmit: (values: FormType) => {
      // TODO(ZaymonFC):
      // Values is a validated instance of FormSchema.

      // If path, visible, width change, update the field.
      // If label / type / digits / ref schema / ref property changes, update view.schema

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
          <Select.Root {...getInputProps('type', 'select')}>
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
