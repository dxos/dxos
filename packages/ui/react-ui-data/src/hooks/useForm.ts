//
// Copyright 2024 DXOS.org
//

import { type ChangeEvent, type FocusEvent, useCallback, useMemo, useState } from 'react';

import { type S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { validateSchema, type ValidationError } from '../util';

// TODO(ZaymonFC): Instead of delegating validation of a schema to the validate call
// you should be able to provide a schema for `values`. Note that there should still
// be a facility for custom validation logic.

type FormInputValue = string | number | readonly string[] | undefined;

type BaseProps<T> = {
  name: keyof T;
  value: T[keyof T] | string;
};

type InputProps<T> = BaseProps<T> & {
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

type SelectProps<T> = BaseProps<T> & {
  onValueChange: (value: FormInputValue) => void;
};

interface FormOptions<T> {
  initialValues: T;
  schema?: S.Schema<T>;
  /**
   * Custom validation function that runs only after schema validation passes.
   * Use this for complex validation logic that can't be expressed in the schema.
   * @returns Array of validation errors, or undefined if validation passes
   */
  additionalValidation?: (values: T) => ValidationError[] | undefined;
  onSubmit: (values: T) => void;
}

type Form<T> = {
  values: T;
  handleChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSubmit: () => void;
  errors: Record<keyof T, string>;
  canSubmit: boolean;
  touched: Record<keyof T, boolean>;
  handleBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  getInputProps: (key: keyof T, type?: 'input' | 'select') => InputProps<T> | SelectProps<T>;
};

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 * Deeply integrated with `@dxos/schema` for schema-based validation.
 */
export const useForm = <T extends object>({
  initialValues,
  schema,
  additionalValidation,
  onSubmit,
}: FormOptions<T>): Form<T> => {
  invariant(additionalValidation != null || schema != null, 'useForm must be called with schema and/or validate');

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(initialiseKeysWithValue(initialValues, false));

  //
  // Validation.
  //

  const validate = useCallback(
    (values: T) => {
      if (schema) {
        const schemaErrors = validateSchema(schema, values) ?? [];
        if (schemaErrors.length > 0) {
          setErrors(collapseErrorArray(schemaErrors));
          return false;
        }
      }

      if (additionalValidation) {
        const validateErrors = additionalValidation(values) ?? [];
        setErrors(collapseErrorArray(validateErrors));
        return validateErrors.length === 0;
      }

      setErrors({} as Record<keyof T, string>);
      return true;
    },
    [schema, additionalValidation],
  );

  //
  // Values.
  //

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name: property, value, type } = event.target;
      const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;
      // TODO(ZaymonFC): Think about nesting!
      const newValues = { ...values, [property]: parsedValue };
      setValues(newValues);
      validate(newValues);
    },
    [values, validate],
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
        //       and results in the submit button being disabled when the form is invalid.
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
    if (validate(values)) {
      onSubmit(values);
    }
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
    (key: keyof T, type: 'input' | 'select' = 'input'): InputProps<T> | SelectProps<T> => {
      const baseProps: BaseProps<T> = {
        name: key,
        value: values[key] ?? '',
      };

      if (type === 'select') {
        return {
          ...baseProps,
          onValueChange: (value: FormInputValue) => onValueChange(key, value),
        };
      }

      return {
        ...baseProps,
        onChange: handleChange,
        onBlur: handleBlur,
      };
    },
    [values, handleChange, handleBlur, onValueChange],
  );

  return {
    values,
    handleChange,
    handleSubmit,
    errors,
    canSubmit,
    touched,
    handleBlur,
    getInputProps,
  } satisfies Form<T>;
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

const collapseErrorArray = <T>(errors: ValidationError[]) =>
  errors.reduce(
    (acc, { path, message }) => {
      // TODO(Zan): This won't play well with nesting.
      acc[path as keyof T] = message;
      return acc;
    },
    {} as Record<keyof T, string>,
  );
