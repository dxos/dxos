//
// Copyright 2025 DXOS.org
//

import {
  type FormActionsProps,
  type FormContentProps,
  type FormGroupProps,
  type FormLayoutProps,
  type FormRootProps,
  type FormSectionProps,
  type FormSubmitProps,
  type FormViewportProps,
  FormActions,
  FormContent,
  FormError,
  FormFieldSetController,
  FormGroup,
  FormLayoutController,
  FormRoot,
  FormSection,
  FormSubmit,
  FormViewport,
} from './FormControls';
import { type FormRowProps, FormFieldLabel, FormRow } from './FormField';

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  Section: FormSection,
  Group: FormGroup,
  FieldSet: FormFieldSetController,
  Layout: FormLayoutController,
  Label: FormFieldLabel,
  Row: FormRow,
  Actions: FormActions,
  Submit: FormSubmit,
  Error: FormError,
};

export type {
  FormActionsProps,
  FormContentProps,
  FormGroupProps,
  FormLayoutProps,
  FormRootProps,
  FormRowProps,
  FormSectionProps,
  FormSubmitProps,
  FormViewportProps,
};
