//
// Copyright 2025 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { type BaseObject, getValue } from '@dxos/echo-schema';
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
  onBlur: (event: FocusEvent) => void;
};

export const useFormValues = (path: (string | number)[] = []): any => {
  const { values: formValues } = useFormContext();
  const jsonPath = createJsonPath(path);
  return getValue(formValues, jsonPath) as BaseObject;
};

export const useInputProps = (path: (string | number)[] = []): FormInputProps => {
  const { getStatus, getValue: getFormValue, onValueChange, onTouched } = useFormContext();

  return {
    getStatus: () => getStatus(path),
    getValue: () => getFormValue(path),
    onValueChange: (type: SimpleType, value: any) => onValueChange(path, type, value),
    onBlur: () => onTouched(path),
  };
};

export const FormProvider = ({ children, ...formOptions }: FormOptions<any> & { children: React.ReactNode }) => {
  const formHandler = useForm(formOptions);
  return <FormContext.Provider value={formHandler as any}>{children}</FormContext.Provider>;
};
