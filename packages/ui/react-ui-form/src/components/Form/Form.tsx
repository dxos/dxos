//
// Copyright 2024 DXOS.org
//

import { type Schema } from 'effect';
import React, { type ReactElement, useEffect, useMemo, useRef } from 'react';

import { type BaseObject, type PropertyKey } from '@dxos/echo-schema';
import { type ThemedClassName } from '@dxos/react-ui';
import { cardSpacing } from '@dxos/react-ui-stack';
import { type SchemaProperty } from '@dxos/schema';

import { FormActions } from './FormActions';
import { FormFields, type FormFieldsProps } from './FormContent';
import { FormProvider } from './FormContext';
import { type InputProps, type InputComponent } from './Input';
import { type FormOptions } from '../../hooks';

export type PropsFilter<T extends BaseObject> = (props: SchemaProperty<T>[]) => SchemaProperty<T>[];

export type ComponentLookup = (args: {
  prop: string;
  schema: Schema.Schema<any>;
  inputProps: InputProps;
}) => ReactElement | undefined;

export type CustomInputMap = Partial<Record<string, InputComponent>>;

export type FormProps<T extends BaseObject> = ThemedClassName<{
  values: Partial<T>;
  // TODO(burdon): Autofocus first input.
  autoFocus?: boolean;
  // TODO(burdon): Change to JsonPath includes/excludes.
  filter?: PropsFilter<T>;
  sort?: PropertyKey<T>[];
  autoSave?: boolean;
  // TODO(burdon): Rename noPadding.
  flush?: boolean;
  onCancel?: () => void;
}> &
  Pick<FormOptions<T>, 'schema' | 'onValuesChanged' | 'onValidate' | 'onSave'> &
  FormFieldsProps;

export const Form = <T extends BaseObject>({
  classNames,
  testId,
  values: initialValues,
  autoFocus,
  readonly,
  autoSave,
  flush,
  onCancel,
  schema,
  onValuesChanged,
  onValidate,
  onSave,
  ...props
}: FormProps<T>) => {
  const formRef = useRef<HTMLDivElement>(null);

  // TODO(burdon): Rename.
  const handleValid = useMemo(() => (autoSave ? onSave : undefined), [autoSave, onSave]);

  // Focus the first input element within this form.
  useEffect(() => {
    if (autoFocus && formRef.current) {
      const input = formRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  }, [autoFocus]);

  return (
    <FormProvider
      formRef={formRef}
      schema={schema}
      autoSave={autoSave}
      initialValues={initialValues}
      onValuesChanged={onValuesChanged}
      onValidate={onValidate}
      onValid={handleValid}
      onSave={onSave}
    >
      <FormFields
        {...props}
        ref={formRef}
        testId={testId}
        classNames={[!flush && cardSpacing, classNames]}
        readonly={readonly}
        schema={schema}
      />

      {(onCancel || onSave) && !autoSave && <FormActions readonly={readonly} onCancel={onCancel} flush={flush} />}
    </FormProvider>
  );
};
