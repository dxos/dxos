//
// Copyright 2024 DXOS.org
//

import { type FocusEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { type BaseObject, type PropertyKey, getValue, setValue } from '@dxos/echo-schema';
import { type SimpleType, type S, type JsonPath } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { validateSchema, type ValidationError } from '@dxos/schema';
import { type MaybePromise } from '@dxos/util';

/**
 * Return type from `useForm` hook.
 */
export type FormHandler<T extends BaseObject> = {
  //
  // Form state management.
  //

  values: Partial<T>;
  errors: Record<PropertyKey<T>, string>;
  touched: Record<PropertyKey<T>, boolean>;
  changed: Record<PropertyKey<T>, boolean>;
  canSave: boolean;
  handleSave: () => void;

  //
  // Form input component helpers.
  //

  getStatus: (property: PropertyKey<T>) => { status?: 'error'; error?: string };
  getValue: <V>(property: PropertyKey<T>) => V | undefined;
  onValueChange: <V>(property: PropertyKey<T>, type: SimpleType, value: V) => void;
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
  initialValues: Partial<T>;

  /**
   * Callback for value changes. Note: This is called even when values are invalid.
   * Sometimes the parent component may want to know about changes even if the form is
   * in an invalid state.
   */
  onValuesChanged?: (values: Partial<T>) => void;

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
  const [values, setValues] = useState<Partial<T>>(initialValues);
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const [touched, setTouched] = useState<Record<PropertyKey<T>, boolean>>(createKeySet(initialValues, false));
  const [changed, setChanged] = useState<Record<PropertyKey<T>, boolean>>(createKeySet(initialValues, false));
  const [errors, setErrors] = useState<Record<PropertyKey<T>, string>>({} as Record<PropertyKey<T>, string>);
  const [saving, setSaving] = useState(false);

  //
  // Validation.
  //

  // TODO(burdon): Validate each property separately.
  const validate = useCallback(
    (values: Partial<T>): values is T => {
      let errors: ValidationError[] = validateSchema(schema, values) ?? [];
      if (errors.length === 0 && onValidate) {
        const validatedValues = values as T;
        errors = onValidate(validatedValues) ?? [];
      }

      setErrors(flatMap(errors));
      const valid = errors.length === 0;
      return valid;
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
      Object.keys(values).every((property) => touched[property as JsonPath] === false || !errors[property as JsonPath]),
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
  }, [values, validate, onSave, changed]);

  //
  // Fields.
  //

  const getStatus = useCallback<FormHandler<T>['getStatus']>(
    (property: PropertyKey<T>) => ({
      status: errors[property] ? 'error' : undefined,
      error: errors[property] ? errors[property] : undefined,
    }),
    [touched, errors],
  );

  // TODO(burdon): Use path to extract hierarchical value.
  const getFormValue = <V>(property: PropertyKey<T>): V | undefined => {
    return getValue(values, property as any as JsonPath);
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

    const newValues = { ...setValue(values, property as any as JsonPath, parsedValue) };
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
    getValue: getFormValue,
    onValueChange,
    onBlur,
  } satisfies FormHandler<T>;
};

const createKeySet = <T extends BaseObject, V>(obj: T, value: V): Record<PropertyKey<T>, V> => {
  invariant(obj);
  return Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<PropertyKey<T>, V>);
};

const flatMap = <T extends BaseObject>(errors: ValidationError[]) => {
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
