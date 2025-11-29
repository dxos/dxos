//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type RefObject, createContext, useContext, useMemo } from 'react';

import { raise } from '@dxos/debug';
import { type AnyProperties, getValue as getValue$ } from '@dxos/echo/internal';
import { type SimpleType, createJsonPath } from '@dxos/effect';

import { type FormHandler, type FormHandlerProps, useFormHandler, useKeyHandler } from '../../hooks';

import { type FormFieldStateProps } from './FormFieldComponent';

type FormContextValue<T extends AnyProperties> = FormHandler<T>;

export const FormContext = createContext<FormContextValue<any> | undefined>(undefined);

export const useFormContext = <T extends AnyProperties>(componentName: string): FormContextValue<T> => {
  return useContext(FormContext) ?? raise(new Error(`Missing FormContext from ${componentName}`));
};

/**
 * Get the current form values.
 */
export const useFormValues = <T extends AnyProperties>(componentName: string, path: (string | number)[] = []): T => {
  const { values } = useFormContext(componentName);
  const jsonPath = createJsonPath(path);
  return getValue$(values, jsonPath) as T;
};

/**
 * Get the state props for the given field.
 */
export const useFormFieldState = (componentName: string, path: (string | number)[] = []): FormFieldStateProps => {
  const { getStatus, getValue, onBlur, onValueChange } = useFormContext(componentName);
  const stablePath = useMemo(() => path, [Array.isArray(path) ? path.join('.') : path]);
  return useMemo(
    () => ({
      getStatus: () => getStatus(stablePath),
      getValue: () => getValue(stablePath),
      onBlur: () => onBlur(stablePath),
      onValueChange: (type: SimpleType, value: any) => onValueChange(stablePath, type, value),
    }),
    [getStatus, getValue, onBlur, onValueChange, stablePath],
  );
};

export type FormProviderProps<T extends AnyProperties> = PropsWithChildren<
  FormHandlerProps<T> & {
    formRef?: RefObject<HTMLDivElement | null>;
    autoSave?: boolean;
  }
>;

export const FormProvider = <T extends AnyProperties>({ children, formRef, ...props }: FormProviderProps<T>) => {
  const form = useFormHandler(props);
  useKeyHandler(formRef?.current ?? null, form);
  return <FormContext.Provider value={form}>{children}</FormContext.Provider>;
};
