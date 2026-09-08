//
// Copyright 2025 DXOS.org
//

import {
  FormActions,
  type FormActionsProps,
  FormContent,
  type FormContentProps,
  FormError,
  FormFieldSetContainer,
  FormGroup,
  type FormGroupProps,
  FormLayoutController,
  type FormLayoutProps,
  FormRoot,
  type FormRootProps,
  FormSection,
  type FormSectionProps,
  FormSubmit,
  type FormSubmitProps,
  FormViewport,
  type FormViewportProps,
} from './FormControls';
import { FormField, FormFieldLabel, type FormFieldProps } from './FormField';

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  Section: FormSection,
  Group: FormGroup,
  FieldSet: FormFieldSetContainer,
  Layout: FormLayoutController,
  Label: FormFieldLabel,
  Field: FormField,
  Actions: FormActions,
  Submit: FormSubmit,
  Error: FormError,
};

export type {
  FormActionsProps,
  FormContentProps,
  FormFieldProps,
  FormGroupProps,
  FormLayoutProps,
  FormRootProps,
  FormSectionProps,
  FormSubmitProps,
  FormViewportProps,
};
