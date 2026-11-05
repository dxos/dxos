//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useEffect, useMemo, useRef } from 'react';

import { type Obj } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { createContext } from '@dxos/react-hooks';

import { type FieldContext, type FormFieldStateProps } from '#types';

import { type FormHandler } from './useFormHandler.ts';

/** Visual variants of a form: `settings` is the two-column settings-panel layout. */
export type FormVariant = 'default' | 'settings';

//
// Context
//

export type FormContextValue<T extends AnyProperties = any> = {
  /**
   * Form handler.
   */
  form: FormHandler<T>;

  /**
   * Testing.
   */
  testId?: string;

  /** Visual variant applied across the form's parts (see Form.theme). */
  variant?: FormVariant;

  /** Editor extensions for the form's editors, beyond their own (what a host's plugins contribute), by field. */
  extensions?: FormExtensions;

  /** The live object the form was given as its values, which collaborative fields bind to. */
  object?: Obj.Unknown;
} & FieldContext;

/** The field an editor edits, for extensions that depend on it (comments anchored to its text). */
export type FormExtensionsField = {
  path: readonly (string | number)[];
  jsonPath: string;
};

/** Extensions for every editor in the form, or by the field each edits. */
export type FormExtensions = Extension[] | ((field: FormExtensionsField) => Extension[]);

/** The form's extensions for one field's editor; stable while the field and the form's extensions are. */
export const useFormExtensions = (field: FormExtensionsField | undefined): Extension[] => {
  const { extensions } = useFormContext('useFormExtensions');
  const jsonPath = field?.jsonPath;
  return useMemo(
    () => (typeof extensions === 'function' ? (field ? extensions(field) : []) : (extensions ?? [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extensions, jsonPath],
  );
};

export const [FormContextProvider, useFormContext] = createContext<FormContextValue>('Form');

/**
 * Get the current form values.
 */
export const useFormValues: {
  <T extends AnyProperties>(componentName: string, path?: (string | number)[]): T;
  <T extends AnyProperties>(
    componentName: string,
    path: (string | number)[] | undefined,
    defaultValue: () => T,
  ): T | undefined;
} = (componentName: string, path?: (string | number)[], defaultValue?: () => any) => {
  const stablePath = useMemo(() => path ?? [], [path ? path.join('.') : undefined]);
  const jsonPath = SchemaEx.createJsonPath(stablePath);
  const {
    form: { values, onValueChange },
  } = useFormContext(componentName);

  const value = SchemaEx.getValue(values, jsonPath);

  // Apply default value once when the field has no value. lastAppliedPathRef prevents
  // re-applying on every render (e.g. when defaultValue() returns null) and ensures
  // we apply per path when the hook is used for different fields.
  const lastAppliedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (value == null && defaultValue && lastAppliedPathRef.current !== jsonPath) {
      lastAppliedPathRef.current = jsonPath;
      onValueChange(stablePath, SchemaAST.stringKeyword, defaultValue());
    }
  }, [value, defaultValue, onValueChange, stablePath, jsonPath]);

  return value;
};

/**
 * Get the state props for the given field.
 */
export const useFormFieldState = (componentName: string, path: (string | number)[] = []): FormFieldStateProps => {
  const stablePath = useMemo(() => path, [Array.isArray(path) ? path.join('.') : path]);
  const {
    form: { getStatus, getValue, onBlur, onValueChange, onRevert },
  } = useFormContext(componentName);

  return useMemo(
    () => ({
      getStatus: () => getStatus(stablePath),
      getValue: () => getValue(stablePath),
      onBlur: () => onBlur(stablePath),
      onValueChange: (ast: SchemaAST.AST, value: any) => onValueChange(stablePath, ast, value),
      onRevert: () => onRevert(stablePath),
    }),
    [getStatus, getValue, onBlur, onValueChange, onRevert, stablePath],
  );
};
