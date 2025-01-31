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

export const useFormValues = (path: (string | number)[] = []) => {
  const { values: formValues, getValue: getFormValue } = useFormContext();
  const jsonPath = createJsonPath(path);
  return getValue(formValues, jsonPath) as BaseObject;
};

export const useInputProps = (path: (string | number)[] = []) => {
  const { getStatus, getValue: getFormValue, onValueChange, onBlur } = useFormContext();

  return useCallback(
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
};

export const FormProvider = ({ children, ...formOptions }: FormOptions<any> & { children: React.ReactNode }) => {
  const formHandler = useForm(formOptions);
  return <FormContext.Provider value={formHandler as any}>{children}</FormContext.Provider>;
};
