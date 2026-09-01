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
} from './FormControls.tsx';
import { FormFieldLabel, FormRow, type FormRowProps } from './FormField/index.ts';

export const Form = {
  Root: FormRoot,
  Viewport: FormViewport,
  Content: FormContent,
  Section: FormSection,
  Group: FormGroup,
  FieldSet: FormFieldSetContainer,
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
