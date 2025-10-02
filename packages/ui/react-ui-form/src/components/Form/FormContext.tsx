//
// Copyright 2025 DXOS.org
//

import React, {
  type FocusEvent,
  type PropsWithChildren,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { raise } from '@dxos/debug';
import { type BaseObject, getValue } from '@dxos/echo-schema';
import { type SimpleType, createJsonPath } from '@dxos/effect';

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

  const stablePath = useMemo(() => path, [Array.isArray(path) ? path.join('.') : path]);
  return useMemo(
    () => ({
      getStatus: () => getStatus(stablePath),
      getValue: () => getFormValue(stablePath),
      onValueChange: (type: SimpleType, value: any) => onValueChange(stablePath, type, value),
      onBlur: () => onTouched(stablePath),
    }),
    [getStatus, getFormValue, onValueChange, onTouched, stablePath],
  );
};

export const FormProvider = ({
  children,
  formRef,
  autoSave,
  ...formOptions
}: PropsWithChildren<
  FormOptions<any> & {
    formRef?: RefObject<HTMLDivElement | null>;
    autoSave?: boolean;
  }
>) => {
  const form = useForm(formOptions);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keyIsEnter = event.key === 'Enter';
      const modifierUsed = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
      const inputIsTextarea = (event.target as HTMLElement).tagName.toLowerCase() === 'textarea';
      const inputOptOut =
        (event.target as HTMLElement).hasAttribute('data-no-submit') ||
        (event.target as HTMLElement).closest('[data-no-submit]') !== null;

      // Regular inputs: Submit on Enter (no modifiers).
      const shouldSubmitRegularInput = !inputIsTextarea && keyIsEnter && !modifierUsed;

      // Textareas: Submit only on Meta+Enter.
      const shouldSubmitTextarea = inputIsTextarea && keyIsEnter && event.metaKey;

      if ((shouldSubmitRegularInput || shouldSubmitTextarea) && !inputOptOut) {
        if (!autoSave && form.canSave) {
          form.handleSave();
        }
        if (autoSave && form.formIsValid) {
          (event.target as HTMLElement).blur();
        }
      }
    },
    [form, autoSave],
  );

  useEffect(() => {
    if (!formRef?.current) {
      return;
    }

    const formElement = formRef.current;

    formElement.addEventListener('keydown', handleKeyDown);
    return () => formElement.removeEventListener('keydown', handleKeyDown);
  }, [formRef, form.canSave, form.formIsValid, form.handleSave, autoSave]);

  return <FormContext.Provider value={form}>{children}</FormContext.Provider>;
};
