//
// Copyright 2024 DXOS.org
//

import { type FocusEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { type BaseObject, type PropertyKey } from '@dxos/echo-schema';
import { type SimpleType, type S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { validateSchema, type ValidationError } from '@dxos/schema';
import { type MaybePromise } from '@dxos/util';

// TODO(ZaymonFC): Where should this live?
export type FormPath<T extends object = {}> = PropertyKey<T> | `${PropertyKey<T>}.${number}`;

/**
 * Return type from `useForm` hook.
 */
export type FormHandler<T extends BaseObject> = {
  //
  // Form state management.
  //

  values: T;
  errors: Record<FormPath<T>, string>;
  touched: Record<FormPath<T>, boolean>;
  changed: Record<FormPath<T>, boolean>;
  canSave: boolean;
  handleSave: () => void;

  //
  // Form input component helpers.
  //

  getStatus: (property: FormPath<T>) => { status?: 'error'; error?: string };
  getValue: <V>(property: FormPath<T>) => V;
  onValueChange: <V>(property: FormPath<T>, type: SimpleType, value: V) => void;
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

/**
 * Hook options.
 */
export interface FormOptions<T extends BaseObject> {
  /**
   * Effect schema.
   */
  // TODO(burdon): Change to S.Struct<T>?
  schema: S.Schema<T>;

  /**
   * Initial values (which may not pass validation).
   */
  // TODO(burdon): Should be partial?
  initialValues: T;

  /**
   * Callback for value changes. Note: This is called even when values are invalid.
   * Sometimes the parent component may want to know about changes even if the form is
   * in an invalid state.
   */
  onValuesChanged?: (values: T) => void;

  /**
   * Custom validation function that runs only after schema validation passes.
   * Use this for complex validation logic that can't be expressed in the schema.
   * @returns Array of validation errors, or undefined if validation passes
   */
  // TODO(burdon): Change to key x value?
  onValidate?: (values: T) => ValidationError[] | undefined;

  /**
   * Called when the form is valid.
   */
  onValid?: (values: T, meta: { changed: FormHandler<T>['changed'] }) => void;

  /**
   * Called when the form is submitted and passes validation.
   */
  onSave?: (values: T, meta: { changed: FormHandler<T>['changed'] }) => MaybePromise<void>;
}

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 * Deeply integrated with `@dxos/schema` for schema-based validation.
 */
export const useForm = <T extends BaseObject>({
  schema,
  initialValues,
  onValuesChanged,
  onValidate,
  onValid,
  onSave,
}: FormOptions<T>): FormHandler<T> => {
  const [values, setValues] = useState<T>(initialValues);
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const [touched, setTouched] = useState<Record<FormPath<T>, boolean>>(createKeySet(initialValues, false));
  const [changed, setChanged] = useState<Record<FormPath<T>, boolean>>(createKeySet(initialValues, false));
  const [errors, setErrors] = useState<Record<FormPath<T>, string>>({} as Record<FormPath<T>, string>);
  const [saving, setSaving] = useState(false);

  //
  // Validation.
  //

  // TODO(burdon): Validate each property separately.
  const validate = useCallback(
    (values: T) => {
      let errors: ValidationError[] = validateSchema(schema, values) ?? [];
      if (errors.length === 0 && onValidate) {
        errors = onValidate(values) ?? [];
      }

      setErrors(flatMap(errors));
      return errors.length === 0;
    },
    [schema, onValidate],
  );

  // Validate on schema change.
  const [schemaDirty, setSchemaDirty] = useState(false);
  useEffect(() => setSchemaDirty(true), [schema]);
  useEffect(() => {
    if (schemaDirty) {
      validate(values);
      setSchemaDirty(false);
    }
  }, [values, schemaDirty]);

  /**
   * NOTE: We can submit if there is no touched field that has an error.
   * Basically, if there's a validation message visible in the form, submit should be disabled.
   */
  const canSave = useMemo(
    () =>
      !saving &&
      Object.keys(values).every(
        (property) => touched[property as PropertyKey<T>] === false || !errors[property as PropertyKey<T>],
      ),
    [values, touched, errors, saving],
  );

  const handleSave = useCallback(async () => {
    if (validate(values)) {
      setSaving(true);
      try {
        await onSave?.(values, { changed });
      } finally {
        setSaving(false);
      }
    }
  }, [values, validate, onSave]);

  //
  // Fields.
  //

  const getStatus = useCallback<FormHandler<T>['getStatus']>(
    (property: FormPath<T>) => ({
      status: errors[property] ? 'error' : undefined,
      error: errors[property] ? errors[property] : undefined,
    }),
    [touched, errors],
  );

  // TODO(burdon): Use path to extract hierarchical value.
  const getValue = <V>(property: FormPath<T>): V => {
    return getByPath(values, property);
  };

  // TODO(burdon): Use path to set hierarchical value.
  const onValueChange = (property: FormPath<T>, type: SimpleType, value: any) => {
    let parsedValue = value;
    try {
      if (type === 'number') {
        parsedValue = parseFloat(value as string) || 0;
      }
    } catch (err) {
      log.catch(err);
      parsedValue = undefined;
    }

    const newValues = setByPath(values, property, parsedValue);
    setValues(newValues);
    setChanged((prev) => ({ ...prev, [property]: true }));
    onValuesChanged?.(newValues);

    const isValid = validate(newValues);
    if (isValid && onValid) {
      onValid(newValues, { changed });
    }
  };

  // TODO(burdon): This is a leaky abstraction: the hook ideally shouldn't get involved in UX.
  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = event.target;
      setTouched((touched) => ({ ...touched, [name]: true }));

      // TODO(Zan): This should be configurable behavior.
      if (event.relatedTarget?.getAttribute('type') === 'submit') {
        // NOTE: We do this here instead of onSave because the blur event is triggered before the submit event
        //  and results in the submit button being disabled when the form is invalid.
        setTouched(createKeySet(values, true));
      }

      validate(values);
    },
    [validate, values],
  );

  return {
    // State.
    values,
    errors,
    touched,
    changed,
    canSave,
    handleSave,

    // Field utils.
    getStatus,
    getValue,
    onValueChange,
    onBlur,
  } satisfies FormHandler<T>;
};

const createKeySet = <T extends BaseObject, V>(obj: T, value: V): Record<FormPath<T>, V> => {
  invariant(obj);
  return Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<FormPath<T>, V>);
};

const flatMap = <T extends BaseObject>(errors: ValidationError[]) => {
  return errors.reduce(
    (result, { path, message }) => {
      if (!(path in result)) {
        result[path as FormPath<T>] = message;
      }
      return result;
    },
    {} as Record<FormPath<T>, string>,
  );
};

// TODO(ZaymonFC): Move to util?
const getByPath = <T extends object, V>(obj: T, path: FormPath<T>): V => {
  const [key, index] = path.split('.');
  return index === undefined ? (obj[key as keyof T] as V) : ((obj[key as keyof T] as any[])[parseInt(index)] as V);
};

const setByPath = <T extends object>(obj: T, path: FormPath<T>, value: any): T => {
  const [key, index] = path.split('.');
  const newValue =
    index === undefined
      ? value
      : [...(obj[key as keyof T] as any[])].map((v, i) => (i === parseInt(index) ? value : v));
  return { ...obj, [key]: newValue };
};
