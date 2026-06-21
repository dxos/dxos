//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as SchemaAST from 'effect/SchemaAST';
import { useEffect, useMemo, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';

import { type FieldContext, type FormFieldStateProps } from '#types';

import { type FormHandler } from './useFormHandler';

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
} & FieldContext;

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
    form: { getStatus, getValue, onBlur, onValueChange },
  } = useFormContext(componentName);

  return useMemo(
    () => ({
      getStatus: () => getStatus(stablePath),
      getValue: () => getValue(stablePath),
      onBlur: () => onBlur(stablePath),
      onValueChange: (ast: SchemaAST.AST, value: any) => onValueChange(stablePath, ast, value),
    }),
    [getStatus, getValue, onBlur, onValueChange, stablePath],
  );
};
