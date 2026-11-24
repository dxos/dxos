//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AnyProperties } from '@dxos/echo/internal';

import { FormField } from './FormField.tsx';
import { FormDispatchScope, FormFields } from './FormFieldDispatch.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';
import { FormLayoutController } from './FormLayout.tsx';
import { FormActions, FormContent, FormErrorText, FormSubmit, FormViewport } from './FormParts.tsx';
import { FormRoot, type FormRootProps } from './FormRoot.tsx';

export * from './FormParts.tsx';

/**
 * `Form.Root`, also providing the dispatcher, so a field that renders fields (`ArrayField`, `InlineRefField`) works as
 * a direct child, with no `Form.Fields` above it.
 */
const FormRootWithDispatch = <T extends AnyProperties = AnyProperties>({ children, ...props }: FormRootProps<T>) => (
  <FormRoot<T> {...props}>
    <FormDispatchScope>{children}</FormDispatchScope>
  </FormRoot>
);

FormRootWithDispatch.displayName = FormRoot.displayName;

/** The `Form` namespace of `@dxos/react-ui-form`, rendered with the `Next` namespace of `@dxos/react-ui`; `Root` is the shared one. */
export const Form = {
  Root: FormRootWithDispatch,
  Viewport: FormViewport,
  Content: FormContent,
  FieldSet: FormFieldSet,
  Fields: FormFields,
  Layout: FormLayoutController,
  Field: FormField,
  Actions: FormActions,
  Submit: FormSubmit,
  ErrorText: FormErrorText,
};

export type { FormRootProps };
