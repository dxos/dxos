//
// Copyright 2026 DXOS.org
//

import { type FocusEvent } from 'react';

import { type SchemaAST } from '@dxos/effect';
import { createContext } from '@dxos/react-hooks';

import { type FormFieldStatus, type FormPresentation } from '#types';

// Kept out of `FormField.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

/** What a bound row provides to the control inside it. */
export type FormFieldBinding<T = any> = {
  /** Dotted from the form's root. */
  path: string;
  type: SchemaAST.AST;
  value: T | undefined;
  setValue: (value: T | undefined) => void;
  onBlur: (event?: FocusEvent<HTMLElement>) => void;
  status: FormFieldStatus['status'];
  error?: string;
  required?: boolean;
  readonly?: boolean;
  presentation?: FormPresentation;
};

export const [FormFieldBindingProvider, useFormFieldBinding] = createContext<FormFieldBinding>('Form.Field');

/**
 * The binding of the enclosing `Form.Field path`, for a control written by hand inside a bound row:
 * the value to show, `setValue` to commit an edit, `onBlur` to mark it touched, and the row's status.
 */
export const useFormField = <T = any>(): FormFieldBinding<T> => useFormFieldBinding('useFormField');
