//
// Copyright 2024 DXOS.org
//
import { type ChangeEvent, useCallback, useState } from 'react';

import { type ValidationError } from '../util';

// TODO(Zan): This module will be generally useful and we should factor it out after the
// API crystallizes a bit more.

interface FormOptions<T> {
  initialValues: T;
  validate: (values: any) => ValidationError[] | undefined;
  onSubmit: (values: T) => void;
}

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 *
 * @example
 * const { values, handleChange, handleSubmit, errors, canSubmit, getInputProps } = useForm({
 *   initialValues: { name: '', email: '' },
 *   validate: (values) => { yourValidationLogic(values); },
 *   onSubmit: (values) => { submissionLogic(values); },
 * });
 */
export const useForm = <T extends object>({ initialValues, validate, onSubmit }: FormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(
    Object.keys(initialValues).reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<keyof T, boolean>),
  );

  const runValidation = useCallback(
    (values: T) => {
      const validationErrors = validate(values);
      setErrors(collapseErrorArray(validationErrors ?? []));

      return validationErrors === undefined;
    },
    [validate],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      const newValues = { ...values, [name]: value };
      setValues(newValues);
      runValidation(newValues);
    },
    [values, runValidation],
  );

  const handleBlur = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = event.target;
      setTouched((touched) => ({ ...touched, [name]: true }));
      runValidation(values);
    },
    [runValidation, values],
  );

  const handleSubmit = useCallback(() => {
    const touchAll = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof T, boolean>,
    );
    setTouched(touchAll);

    if (runValidation(values)) {
      onSubmit(values);
    }
  }, [values, runValidation, onSubmit]);

  // NOTE: We can submit if there is no touched field that has an error.
  // - Basically, if there's a validation message present in the form, submit should be disabled.
  const canSubmit = Object.keys(values).every((key) => touched[key as keyof T] === false || !errors[key as keyof T]);

  const getInputProps = (key: keyof T) => ({
    name: key,
    value: values[key],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': errors[key] !== undefined,
  });

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

const collapseErrorArray = <T>(errors: ValidationError[]) =>
  errors.reduce(
    (acc, { path, message }) => {
      // TODO(Zan): This won't play well with nesting.
      acc[path as keyof T] = message;
      return acc;
    },
    {} as Record<keyof T, string>,
  );
