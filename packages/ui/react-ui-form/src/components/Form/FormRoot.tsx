//
// Copyright 2025 DXOS.org
//

import React, {
  type PropsWithChildren,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { raise } from '@dxos/debug';
import { type AnyProperties, getValue } from '@dxos/echo/internal';
import { type SimpleType, createJsonPath } from '@dxos/effect';

import { type FormHandler, type FormOptions, useFormHandler } from '../../hooks';

import { type FormFieldStateProps } from './FormFieldComponent';

type FormContextValue<T extends AnyProperties> = FormHandler<T>;

export const FormContext = createContext<FormContextValue<any> | undefined>(undefined);

export const useFormContext = <T extends AnyProperties>(componentName: string): FormContextValue<T> => {
  return useContext(FormContext) ?? raise(new Error(`Missing FormContext from ${componentName}`));
};

/**
 * Get the current form values.
 */
export const useFormValues = (componentName: string, path: (string | number)[] = []): any => {
  const { values: formValues } = useFormContext(componentName);
  const jsonPath = createJsonPath(path);
  return getValue(formValues, jsonPath) as AnyProperties;
};

/**
 * Get the state props for the given field.
 */
export const useFormFieldState = (componentName: string, path: (string | number)[] = []): FormFieldStateProps => {
  const { getStatus, getValue: getFormValue, onBlur, onValueChange } = useFormContext(componentName);
  const stablePath = useMemo(() => path, [Array.isArray(path) ? path.join('.') : path]);
  return useMemo(
    () => ({
      getStatus: () => getStatus(stablePath),
      getValue: () => getFormValue(stablePath),
      onBlur: () => onBlur(stablePath),
      onValueChange: (type: SimpleType, value: any) => onValueChange(stablePath, type, value),
    }),
    [getStatus, getFormValue, onBlur, onValueChange, stablePath],
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
  const form = useFormHandler(formOptions);

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
    [form.canSave, form.formIsValid, form.handleSave, autoSave],
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
