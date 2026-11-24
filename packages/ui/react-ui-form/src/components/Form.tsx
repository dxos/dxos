//
// Copyright 2026 DXOS.org
//

import { FormField } from './FormField.tsx';
import { FormFields } from './FormFieldDispatch.tsx';
import { FormFieldSet } from './FormFieldSet.tsx';
import { FormLayoutController } from './FormLayout.tsx';
import { FormActions, FormContent, FormErrorText, FormSubmit, FormViewport } from './FormParts.tsx';
import { FormRoot, type FormRootProps } from './FormRoot.tsx';

export * from './FormParts.tsx';

/** The `Form` namespace of `@dxos/react-ui-form`, rendered with the `Next` namespace of `@dxos/react-ui`; `Root` is the shared one. */
export const Form = {
  Root: FormRoot,
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
