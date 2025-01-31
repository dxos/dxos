//
// Copyright 2025 DXOS.org
//

import React, { createContext, useContext, useCallback } from 'react';

import { type JsonPath, type BaseObject, getValue } from '@dxos/echo-schema';
import { createJsonPath, type SimpleType } from '@dxos/effect';
import { type FormHandler, type FormOptions, useForm } from '../../hooks';

type FormContextValue<T extends BaseObject> = FormHandler<T>;

const FormContext = createContext<FormContextValue<any> | undefined>(undefined);

export const useFormContext = <T extends BaseObject>() => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context as FormContextValue<T>;
};

// TODO(ZaymonFC): Rename FormDataProps? InputStateProps?
export type FormInputProps = {
  getStatus: () => { status?: 'error'; error?: string };
  getValue: <V>() => V | undefined;
  onValueChange: (type: SimpleType, value: any) => void;
} & Pick<FormHandler<any>, 'onBlur'>;

// TODO(ZaymonFC): This should move into the useForm hook itself and be called something like
//   useSubform or useScopedForm.
export const useScopedForm = (path: (string | number)[] = []) => {
  const {
    values: formValues,
    errors,
    touched,
    onValueChange,
    onBlur,
    getValue: getFormValue,
    getStatus,
  } = useFormContext();

  const jsonPath = createJsonPath(path);
  const values = getValue(formValues, jsonPath) as BaseObject; // TODO(ZaymonFC): This cast does nothing useful anymore.

  const getPropertyValue = useCallback(
    (property: string) => {
      const fullPath = createJsonPath([...path, property]);

      // TODO(ZaymonFC): Check that this works for nested paths.
      return getFormValue(fullPath as JsonPath);
    },
    [formValues, path],
  );

  const setValue = useCallback(
    (property: string, value: any) => {
      const fullPath = createJsonPath([...path, property]);
      onValueChange(fullPath as any, 'any' as any, value);
    },
    [onValueChange, path],
  );

  const getInputProps = useCallback(
    (property: string | number): FormInputProps => {
      const pathArray = [...path, property];
      const fullPath = createJsonPath(pathArray);
      return {
        getStatus: () => getStatus(fullPath),
        getValue: () => getFormValue(fullPath),
        onValueChange: (type: SimpleType, value: any) => onValueChange(fullPath, type, value),
        onBlur,
      };
    },
    [path, getStatus, getFormValue, onValueChange, onBlur],
  );

  return {
    values,
    getValue: getPropertyValue,
    setValue,
    errors: errors as Record<string, string>,
    touched: touched as Record<string, boolean>,
    getInputProps,
  };
};

export const FormProvider = ({ children, ...formOptions }: FormOptions<any> & { children: React.ReactNode }) => {
  const formHandler = useForm(formOptions);
  return <FormContext.Provider value={formHandler as any}>{children}</FormContext.Provider>;
};
