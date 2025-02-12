//
// Copyright 2025 DXOS.org
//

import React, { createContext, useContext, type FocusEvent, type PropsWithChildren } from 'react';

import { raise } from '@dxos/debug';
import { type BaseObject, getValue } from '@dxos/echo-schema';
import { createJsonPath, type SimpleType } from '@dxos/effect';

import { type FormHandler, type FormOptions, useForm } from '../../hooks';

type FormContextValue<T extends BaseObject> = FormHandler<T>;

const FormContext = createContext<FormContextValue<any> | undefined>(undefined);

export const useFormContext = <T extends BaseObject>(): FormContextValue<T> => {
  return useContext(FormContext) ?? raise(new Error('Missing FormContext'));
};

export const useFormValues = (path: (string | number)[] = []): any => {
  const { values: formValues } = useFormContext();
  const jsonPath = createJsonPath(path);
  return getValue(formValues, jsonPath) as BaseObject;
};

export type FormInputStateProps = {
  getStatus: () => { status?: 'error'; error?: string };
  getValue: <V>() => V | undefined;
  onValueChange: (type: SimpleType, value: any) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

export const useInputProps = (path: (string | number)[] = []): FormInputStateProps => {
  const { getStatus, getValue: getFormValue, onValueChange, onTouched } = useFormContext();

  return {
    getStatus: () => getStatus(path),
    getValue: () => getFormValue(path),
    onValueChange: (type: SimpleType, value: any) => onValueChange(path, type, value),
    onBlur: () => onTouched(path),
  };
};

export const FormProvider = ({ children, ...formOptions }: PropsWithChildren<FormOptions<any>>) => {
  const formHandler = useForm(formOptions);
  return <FormContext.Provider value={formHandler}>{children}</FormContext.Provider>;
};
