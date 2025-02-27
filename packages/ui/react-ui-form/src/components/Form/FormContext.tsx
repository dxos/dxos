//
// Copyright 2025 DXOS.org
//

import React, { createContext, useContext, useEffect, type FocusEvent, type PropsWithChildren } from 'react';

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

export const FormProvider = ({
  children,
  formRef,
  autoSave,
  ...formOptions
}: PropsWithChildren<
  FormOptions<any> & {
    formRef?: React.RefObject<HTMLDivElement>;
    autoSave?: boolean;
  }
>) => {
  const form = useForm(formOptions);

  useEffect(() => {
    if (!formRef?.current) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const keyIsEnter = event.key === 'Enter';
      const modifierUsed = event.shiftKey || event.ctrlKey || event.altKey || event.metaKey;
      const inputIsTextarea = (event.target as HTMLElement).tagName.toLowerCase() === 'textarea';

      if (keyIsEnter && !inputIsTextarea && !modifierUsed) {
        if (!autoSave && form.canSave) {
          form.handleSave();
        }
        if (autoSave && form.formIsValid) {
          console.log('YUS');
          (event.target as HTMLElement).blur();
        }
      }
    };

    const formElement = formRef.current;

    formElement.addEventListener('keydown', handleKeyDown);
    return () => formElement.removeEventListener('keydown', handleKeyDown);
  }, [formRef, form, autoSave]);

  return <FormContext.Provider value={form}>{children}</FormContext.Provider>;
};
