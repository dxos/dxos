//
// Copyright 2024 DXOS.org
//

import { type ChangeEvent, type FocusEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { type S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { validateSchema, type ValidationError } from '@dxos/schema';

type FormInputValue = string | number | readonly string[] | undefined;

type BaseProps<T, V> = {
  name: keyof T;
  value: V;
};

type InputProps<T> = BaseProps<T, string> & {
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

type SelectProps<T> = BaseProps<T, string | undefined> & {
  onValueChange: (value: string | undefined) => void;
};

export type FormResult<T extends object> = {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  canSubmit: boolean;
  changed: Record<keyof T, boolean>;
  /**
   * Provider for props for input controls.
   */
  getInputProps: <InputType extends 'input' | 'select'>(
    key: keyof T,
    type?: InputType,
  ) => InputType extends 'select' ? SelectProps<T> : InputProps<T>;
  getErrorValence: (key: keyof T) => 'error' | undefined;
  getErrorMessage: (key: keyof T) => string | undefined;
  handleChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSubmit: () => void;
};

export interface FormOptions<T extends object> {
  initialValues: T;
  schema?: S.Schema<T>;
  /**
   * Custom validation function that runs only after schema validation passes.
   * Use this for complex validation logic that can't be expressed in the schema.
   * @returns Array of validation errors, or undefined if validation passes
   */
  onValidate?: (values: T) => ValidationError[] | undefined;
  /**
   * Callback for value changes. Note: This is called even when values are invalid.
   * Sometimes the parent component may want to know about changes even if the form is
   * in an invalid state.
   */
  onValuesChanged?: (values: T) => void;
  onSubmit: (values: T, meta: { changed: FormResult<T>['changed'] }) => void;
}

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 * Deeply integrated with `@dxos/schema` for schema-based validation.
 */
export const useForm = <T extends object>({
  initialValues,
  schema,
  onValidate,
  onValuesChanged,
  onSubmit,
}: FormOptions<T>): FormResult<T> => {
  const [values, setValues] = useState<T>(initialValues);
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const [changed, setChanged] = useState<Record<keyof T, boolean>>(initialiseKeysWithValue(initialValues, false));
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(initialiseKeysWithValue(initialValues, false));
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);

  //
  // Validation.
  //

  const validate = useCallback(
    (values: T) => {
      let errors: ValidationError[] = [];

      if (schema) {
        const schemaErrors = validateSchema(schema, values) ?? [];
        if (schemaErrors.length > 0) {
          errors = schemaErrors;
        }
      }

      if (onValidate && errors.length === 0) {
        const validateErrors = onValidate(values) ?? [];
        errors = validateErrors;
      }

      setErrors(errors.length > 0 ? collapseErrorArray(errors) : ({} as Record<keyof T, string>));
    },
    [schema, onValidate],
  );

  useEffect(() => validate(values), [schema, validate, values]);

  //
  // Values.
  //

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name: property, value, type } = event.target;
      const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;
      const newValues = { ...values, [property]: parsedValue };
      setValues(newValues);
      setChanged((prev) => ({ ...prev, [property]: true }));
      onValuesChanged?.(newValues);
    },
    [values, onValuesChanged],
  );

  const onValueChange = useCallback(
    (key: keyof T, value: FormInputValue) => {
      handleChange({ target: { name: key, value } } as ChangeEvent<HTMLInputElement>);
    },
    [handleChange],
  );

  //
  //  Touch and Blur.
  //

  const touchAll = useCallback(() => setTouched(markAllTouched(values)), [values, setTouched]);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = event.target;
      setTouched((touched) => ({ ...touched, [name]: true }));

      // TODO(Zan): This should be configurable behavior.
      if (event.relatedTarget?.getAttribute('type') === 'submit') {
        // NOTE: We do this here instead of onSubmit, because the blur event is triggered before the submit event
        //  and results in the submit button being disabled when the form is invalid.
        touchAll();
      }

      validate(values);
    },
    [validate, values, touchAll],
  );

  //
  // Submission.
  //

  const handleSubmit = useCallback(() => {
    invariant(Object.keys(errors).length === 0, 'Submission should be disabled when there are errors present');
    onSubmit(values, { changed });
  }, [values, validate, onSubmit]);

  const canSubmit = useMemo(
    // NOTE: We can submit if there is no touched field that has an error.
    // - Basically, if there's a validation message visible in the form, submit should be disabled.
    () => Object.keys(values).every((key) => touched[key as keyof T] === false || !errors[key as keyof T]),
    [values, touched, errors],
  );

  //
  // Input Interface.
  //

  const getInputProps = useCallback(
    <InputType extends 'input' | 'select' = 'input'>(
      key: keyof T,
      type?: InputType,
    ): InputType extends 'select' ? SelectProps<T> : InputProps<T> => {
      const baseProps: BaseProps<T, any> = {
        name: key,
        value: values[key] ?? '',
      };

      if (type === 'select') {
        return {
          ...baseProps,
          onValueChange: (value: FormInputValue) => onValueChange(key, value),
        } as InputType extends 'select' ? SelectProps<T> : InputProps<T>;
      }

      return {
        ...baseProps,
        onChange: handleChange,
        onBlur: handleBlur,
      } as InputType extends 'select' ? SelectProps<T> : InputProps<T>;
    },
    [values, handleChange, handleBlur, onValueChange],
  );

  //
  // Helpers
  //

  const getErrorValence = useCallback(
    (key: keyof T) => (touched[key] && errors[key] ? 'error' : undefined),
    [touched, errors],
  );

  const getErrorMessage = useCallback(
    (key: keyof T) => (touched[key] && errors[key] ? errors[key] : undefined),
    [touched, errors],
  );

  return {
    values,
    errors,
    touched,
    canSubmit,
    changed,
    getInputProps,
    getErrorValence,
    getErrorMessage,
    handleChange,
    handleBlur,
    handleSubmit,
  } satisfies FormResult<T>;
};

//
// Util. (Keeping this here until useForm gets its own library).
//

const initialiseKeysWithValue = <T extends object, V>(obj: T, value: V): Record<keyof T, V> => {
  return Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<keyof T, V>);
};

const markAllTouched = <T extends Record<keyof T, any>>(values: T) => {
  return initialiseKeysWithValue(values, true);
};

const collapseErrorArray = <T extends object>(errors: ValidationError[]) =>
  errors.reduce(
    (acc, { path, message }) => {
      if (!(path in acc)) {
        acc[path as keyof T] = message;
      }
      return acc;
    },
    {} as Record<keyof T, string>,
  );
