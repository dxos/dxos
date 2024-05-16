//
// Copyright 2024 DXOS.org
//
import { type ChangeEvent, useCallback, useState, useEffect } from 'react';

import { type ValidationError } from '../util';

interface FormOptions<T> {
  initialValues: T;
  validate: (values: any) => ValidationError[] | undefined;
  onSubmit: (values: T) => void;
}

export const useForm = <T extends Record<string, any>>({ initialValues, validate, onSubmit }: FormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const onValidate = useCallback(
    (values: T) => {
      const validationErrors = validate(values);
      setErrors(collapseErrorArray(validationErrors ?? []));

      return validationErrors === undefined;
    },
    [validate],
  );

  useEffect(() => {
    onValidate(values);
  }, [values, onValidate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setValues((values) => ({ ...values, [name]: value }));
    setTouched((touched) => ({ ...touched, [name]: true }));
  };

  const touchOnBlur = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = event.target;
    setTouched((touched) => ({ ...touched, [name]: true }));
  };

  const handleSubmit = useCallback(() => {
    const allTouched = Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    if (!onValidate(values)) {
      return;
    }

    onSubmit(values);
  }, [values, onValidate, onSubmit]);

  const isInvalid = Object.keys(errors).length !== 0;

  return { values, handleChange, handleSubmit, errors, isInvalid, touched, touchOnBlur, onValidate };
};

const collapseErrorArray = (errors: ValidationError[]) =>
  errors.reduce(
    (acc, { path, message }) => {
      acc[path] = message;
      return acc;
    },
    {} as Record<string, string>,
  );
