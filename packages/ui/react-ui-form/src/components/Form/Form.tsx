//
// Copyright 2025 DXOS.org
//

import {
  FormActions,
  type FormActionsProps,
  FormContent,
  type FormContentProps,
  FormError,
  FormFieldSetController,
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
import { FormFieldLabel, FormRow, type FormRowProps } from './FormField';

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  Section: FormSection,
  FieldSet: FormFieldSetController,
  Layout: FormLayoutController,
  Label: FormFieldLabel,
  Row: FormRow,
  Actions: FormActions,
  Submit: FormSubmit,
  Error: FormError,
};

export type {
  FormRootProps,
  FormViewportProps,
  FormContentProps,
  FormSectionProps,
  FormLayoutProps,
  FormActionsProps,
  FormSubmitProps,
  FormRowProps,
};
