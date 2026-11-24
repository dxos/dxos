//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as SchemaEx from '@dxos/effect/SchemaEx';

import { useFormContext } from '../hooks/index.ts';
import { useFormSchemaProperty } from './field-binding.tsx';
import { FormDispatchScope, FormFieldDispatch } from './FormFieldDispatch.tsx';
import { FormControlField, type FormFieldProps } from './FormFieldRow.tsx';

export { type FormFieldProps, FormFieldRow, type FormFieldRowProps, FormStaticValue } from './FormFieldRow.tsx';

const FORM_FIELD_NAME = 'Form.Field';

/** The leaf row, bound (`path`) or not; same contract as the current `Form.Field`. */
export const FormField = <T,>(props: FormFieldProps<T>) =>
  props.path !== undefined && props.children === undefined ? (
    <FormBoundFieldDispatch {...props} path={props.path} />
  ) : (
    <FormControlField<T> {...props} />
  );

FormField.displayName = FORM_FIELD_NAME;

const FormBoundFieldDispatch = <T,>({ path, ...props }: Omit<FormFieldProps<T>, 'path'> & { path: string }) => {
  const { form: _form, variant: _variant, testId: _testId, ...context } = useFormContext(FORM_FIELD_NAME);
  const property = useFormSchemaProperty(FORM_FIELD_NAME, path);
  if (!property) {
    return null;
  }
  const segments = SchemaEx.isJsonPath(path) ? SchemaEx.splitJsonPath(path) : [];
  return (
    <FormDispatchScope>
      <FormFieldDispatch
        {...context}
        type={property.type}
        name={String(segments[segments.length - 1])}
        label={props.label}
        path={segments}
        required={props.required ?? property.required}
        readonly={props.readonly ?? context.readonly}
        layout={props.presentation ?? context.layout}
      />
    </FormDispatchScope>
  );
};
