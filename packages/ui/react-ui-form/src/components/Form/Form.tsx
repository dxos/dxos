//
// Copyright 2025 DXOS.org
//

import {
  FormActions,
  type FormActionsProps,
  FormContent,
  type FormContentProps,
  FormErrorText,
  FormLayoutController,
  type FormLayoutProps,
  FormRoot,
  type FormRootProps,
  FormSubmit,
  type FormSubmitProps,
  FormViewport,
  type FormViewportProps,
} from './FormControls.tsx';
import { FormField, FormFieldLabel, type FormFieldProps } from './FormField/index.ts';
import { FormFields, type FormFieldsProps } from './FormFields/index.ts';
import { FormFieldSet, type FormFieldSetProps } from './FormFieldSet/index.ts';

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  FieldSet: FormFieldSet,
  Fields: FormFields,
  Layout: FormLayoutController,
  Label: FormFieldLabel,
  Field: FormField,
  Actions: FormActions,
  Submit: FormSubmit,
  ErrorText: FormErrorText,
};

export type {
  FormActionsProps,
  FormContentProps,
  FormFieldProps,
  FormFieldSetProps,
  FormFieldsProps,
  FormLayoutProps,
  FormRootProps,
  FormSubmitProps,
  FormViewportProps,
};
