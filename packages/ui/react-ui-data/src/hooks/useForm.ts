//
// Copyright 2024 DXOS.org
//

import { type ChangeEvent, type FocusEvent, useCallback, useState } from 'react';

import { type S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { validateSchema, type ValidationError } from '../util';

// TODO(ZaymonFC): Instead of delegating validation of a schema to the validate call
// you should be able to provide a schema for `values`. Note that there should still
// be a facility for custom validation logic.

type InputValue = string | number | readonly string[] | undefined;

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

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 */
export const useForm = <T extends object>({
  initialValues,
  schema,
  additionalValidation,
  onSubmit,
}: FormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(
    Object.keys(initialValues).reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<keyof T, boolean>),
  );

  invariant(additionalValidation != null || schema != null, 'useForm must be called with schema and/or validate');

  const runValidation = useCallback(
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

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name: property, value, type } = event.target;
      const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;
      // TODO(ZaymonFC): Think about nesting!
      const newValues = { ...values, [property]: parsedValue };
      setValues(newValues);
      runValidation(newValues);
    },
    [values, runValidation],
  );

  const onValueChange = useCallback(
    (key: keyof T, value: InputValue) => {
      handleChange({ target: { name: key, value } } as ChangeEvent<HTMLInputElement>);
    },
    [handleChange],
  );

  const touchAll = useCallback(() => setTouched(mkAllTouched(values)), [values, setTouched]);

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

      runValidation(values);
    },
    [runValidation, values, touchAll],
  );

  const handleSubmit = useCallback(() => {
    if (runValidation(values)) {
      onSubmit(values);
    }
  }, [values, runValidation, onSubmit]);

  // NOTE: We can submit if there is no touched field that has an error.
  // - Basically, if there's a validation message present in the form, submit should be disabled.
  const canSubmit = Object.keys(values).every((key) => touched[key as keyof T] === false || !errors[key as keyof T]);

  const getInputProps = useCallback(
    (key: keyof T) => ({
      name: key,
      value: values[key] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
      onValueChange: (value: InputValue) => onValueChange(key, value),
      'aria-invalid': errors[key] !== undefined,
    }),
    [values, handleChange, handleBlur, errors],
  );

  return {
    values,
    handleChange,
    handleSubmit,
    errors,
    canSubmit,
    touched,
    handleBlur,
    onValidate: runValidation,
    getInputProps,
  };
};

const mkAllTouched = <T extends Record<keyof T, any>>(values: T) => {
  return Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<keyof T, boolean>);
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
