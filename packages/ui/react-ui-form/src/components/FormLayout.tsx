//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useFormContext } from '../hooks/index.ts';
import { FormLayout, type FormLayoutProps } from './FormFieldDispatch.tsx';

export { FormLayout, type FormLayoutProps } from './FormFieldDispatch.tsx';
export { CELL, LayoutHeader, rowLayout } from './layout/LayoutHeader.tsx';

const FORM_LAYOUT_NAME = 'Form.Layout';

/** `Form.Layout`: the form's own schema laid out by a template (or the schema's annotation). */
export const FormLayoutController = ({
  schema,
  ...props
}: Omit<FormLayoutProps, 'schema'> & Partial<Pick<FormLayoutProps, 'schema'>>) => {
  const { form, variant: _variant, testId: _testId, ...context } = useFormContext(FORM_LAYOUT_NAME);
  const resolved = schema ?? form.schema;
  return resolved ? <FormLayout schema={resolved} {...context} {...props} /> : null;
};

FormLayoutController.displayName = FORM_LAYOUT_NAME;
