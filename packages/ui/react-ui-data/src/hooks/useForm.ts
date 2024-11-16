//
// Copyright 2024 DXOS.org
//

import { type FocusEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { type SimpleType, type S } from '@dxos/effect';
import { log } from '@dxos/log';
import { validateSchema, type PropertyKey, type ValidationError } from '@dxos/schema';

/**
 * Return type from `useForm` hook.
 */
export type FormHandler<T extends object> = {
  //
  // State management for form.
  //

  values: T;
  errors: Record<PropertyKey<T>, string>;
  touched: Record<PropertyKey<T>, boolean>;
  changed: Record<PropertyKey<T>, boolean>;
  canSubmit: boolean;
  handleSubmit: () => void;

  //
  // Property input component helpers.
  //

  getErrorValence: (property: PropertyKey<T>) => 'error' | undefined;
  getErrorMessage: (property: PropertyKey<T>) => string | undefined;
  getValue: <V>(property: PropertyKey<T>, type: SimpleType) => V;
  onValueChange: <V>(property: PropertyKey<T>, type: SimpleType, value: V) => void;
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
  onSubmit: (values: T, meta: { changed: FormHandler<T>['changed'] }) => void;
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
}: FormOptions<T>): FormHandler<T> => {
  const [values, setValues] = useState<T>(initialValues);
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const [changed, setChanged] = useState<Record<PropertyKey<T>, boolean>>(
    initialiseKeysWithValue(initialValues, false),
  );
  const [touched, setTouched] = useState<Record<PropertyKey<T>, boolean>>(
    initialiseKeysWithValue(initialValues, false),
  );
  const [errors, setErrors] = useState<Record<PropertyKey<T>, string>>({} as Record<PropertyKey<T>, string>);

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

      setErrors(errors.length > 0 ? collapseErrorArray(errors) : ({} as Record<PropertyKey<T>, string>));
      return errors.length === 0;
    },
    [schema, onValidate],
  );

  useEffect(() => {
    validate(values);
  }, [schema, validate, values]);

  //
  // Values.
  //

  // TODO(burdon): Check V agrees with type.
  // TODO(burdon): Use path to extract hierarchical value.
  const getValue = <V>(property: PropertyKey<T>, type: SimpleType): V => {
    return values[property] as V;
  };

  const onValueChange = (property: PropertyKey<T>, type: SimpleType, value: any) => {
    let parsedValue = value;
    try {
      if (type === 'number') {
        parsedValue = parseFloat(value as string) || 0;
      }
    } catch (err) {
      log.catch(err);
      parsedValue = undefined;
    }

    const newValues = { ...values, [property]: parsedValue };
    setValues(newValues);
    setChanged((prev) => ({ ...prev, [property]: true }));
    onValuesChanged?.(newValues);
  };

  //
  // Helpers.
  //

  const touchAll = useCallback(() => setTouched(markAllTouched(values)), [values, setTouched]);

  const onBlur = useCallback(
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

  /**
   * NOTE: We can submit if there is no touched field that has an error.
   * Basically, if there's a validation message visible in the form, submit should be disabled.
   */
  const canSubmit = useMemo(
    () =>
      Object.keys(values).every((key) => touched[key as PropertyKey<T>] === false || !errors[key as PropertyKey<T>]),
    [values, touched, errors],
  );

  const handleSubmit = useCallback(() => {
    if (validate(values)) {
      onSubmit(values, { changed });
    }
  }, [values, validate, onSubmit]);

  //
  // Helpers
  //

  const getErrorValence = useCallback(
    (property: PropertyKey<T>) => (touched[property] && errors[property] ? 'error' : undefined),
    [touched, errors],
  );

  const getErrorMessage = useCallback(
    (property: PropertyKey<T>) => (touched[property] && errors[property] ? errors[property] : undefined),
    [touched, errors],
  );

  return {
    // State.
    values,
    errors,
    touched,
    changed,
    canSubmit,
    handleSubmit,

    // Field utils.
    getErrorValence,
    getErrorMessage,
    getValue,
    onValueChange,
    onBlur,
  } satisfies FormHandler<T>;
};

const initialiseKeysWithValue = <T extends object, V>(obj: T, value: V): Record<PropertyKey<T>, V> => {
  return Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<PropertyKey<T>, V>);
};

const markAllTouched = <T extends Record<PropertyKey<T>, any>>(values: T) => {
  return initialiseKeysWithValue(values, true);
};

const collapseErrorArray = <T extends object>(errors: ValidationError[]) => {
  return errors.reduce(
    (result, { path, message }) => {
      if (!(path in result)) {
        result[path as PropertyKey<T>] = message;
      }
      return result;
    },
    {} as Record<PropertyKey<T>, string>,
  );
};
