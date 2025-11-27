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

import { addEventListener } from '@dxos/async';
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

export type FormProviderProps = PropsWithChildren<
  FormOptions<any> & {
    formRef?: RefObject<HTMLDivElement | null>;
    autoSave?: boolean;
  }
>;

export const FormProvider = ({ children, formRef, autoSave, ...formOptions }: FormProviderProps) => {
  const form = useFormHandler(formOptions);
  useKeyHandler(formRef?.current ?? null, form, autoSave);
  return <FormContext.Provider value={form}>{children}</FormContext.Provider>;
};

/**
 * Key handler.
 */
const useKeyHandler = (formElement: HTMLDivElement | null, form: FormHandler<any>, autoSave?: boolean) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          const modifier = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
          const isTextarea = (event.target as HTMLElement).tagName.toLowerCase() === 'textarea';

          // E.g., opt-out on combobox selection.
          const optOut =
            (event.target as HTMLElement).hasAttribute('data-no-submit') ||
            (event.target as HTMLElement).closest('[data-no-submit]') !== null;

          // TODO(burdon): Explain why disabled if modifier.
          if ((isTextarea ? event.metaKey : !modifier) && !optOut) {
            if (!autoSave && form.canSave) {
              form.onSave();
            }

            // TODO(burdon): WHY?
            if (autoSave && form.formIsValid) {
              (event.target as HTMLElement).blur();
            }
          }
          break;
        }
      }
    },
    [form.canSave, form.formIsValid, form.onSave, autoSave],
  );

  useEffect(() => {
    if (!formElement) {
      return;
    }

    // TODO(burdon): Move to @dxos/dom-util.
    return addEventListener(formElement, 'keydown', handleKeyDown);
  }, [formElement, handleKeyDown]);
};
