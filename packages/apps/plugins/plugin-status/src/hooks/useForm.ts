//
// Copyright 2024 DXOS.org
//
import { type ChangeEvent, useState } from 'react';

import { type ValidationError } from '../util';

interface FormOptions<T> {
  initialState: T;
  validate: (values: T) => ValidationError[] | undefined;
  onSubmit: (values: T) => void;
}

export const useForm = <T>({ initialState, validate, onSubmit }: FormOptions<T>) => {
  const [values, setValues] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // For now we can be super basic and use the field name as the key.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues({ ...values, [name]: value });
  };

  const onValidate = () => {
    const validationErrors = validate(values);

    if (!validationErrors) {
      setErrors({});
      return;
    }

    setErrors(collapseErrorArray(validationErrors));
  };

  // Handles form submission with validation
  const handleSubmit = () => {
    if (Object.keys(errors).length !== 0) {
      return;
    }

    onSubmit(values);
  };

  return { values, handleChange, handleSubmit, errors, onValidate };
};

const collapseErrorArray = (errors: ValidationError[]) =>
  errors.reduce(
    (acc, { path, message }) => {
      acc[path] = message;
      return acc;
    },
    {} as Record<string, string>,
  );
