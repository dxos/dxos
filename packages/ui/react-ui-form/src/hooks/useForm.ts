//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type BaseObject, getValue, setValue } from '@dxos/echo-schema';
import { type SimpleType, type S, type JsonPath, createJsonPath, fromEffectValidationPath } from '@dxos/effect';
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
  errors: Record<JsonPath, string>;
  touched: Record<JsonPath, boolean>;
  changed: Record<JsonPath, boolean>;
  canSave: boolean;
  handleSave: () => void;

  //
  // Form input component helpers.
  //

  getStatus: (path: string | (string | number)[]) => { status?: 'error'; error?: string };
  getValue: <V>(path: (string | number)[]) => V | undefined;
  onValueChange: <V>(path: (string | number)[], type: SimpleType, value: V) => void;
  onTouched: (path: (string | number)[]) => void;
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

  const [touched, setTouched] = useState<Record<JsonPath, boolean>>(createKeySet(initialValues, false));
  const [changed, setChanged] = useState<Record<JsonPath, boolean>>(createKeySet(initialValues, false));
  const [errors, setErrors] = useState<Record<JsonPath, string>>({});
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
      // Check if any error paths that are touched have errors
      !Object.entries(touched).some(
        ([path, isTouched]) =>
          isTouched &&
          Object.keys(errors).some(
            (errorPath) => errorPath === path || errorPath.startsWith(`${path}.`) || errorPath.startsWith(`${path}[`),
          ),
      ),
    [touched, errors, saving],
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
    (path) => {
      const jsonPath = Array.isArray(path) ? createJsonPath(path) : path;
      const matchingError = Object.entries(errors).find(
        ([errorPath]) =>
          errorPath === jsonPath || errorPath.startsWith(`${jsonPath}.`) || errorPath.startsWith(`${jsonPath}[`),
      );

      return {
        status: matchingError ? 'error' : undefined,
        error: matchingError ? matchingError[1] : undefined,
      };
    },
    [errors],
  );

  const getFormValue = <V>(path: (string | number)[]): V | undefined => {
    return getValue(values, createJsonPath(path));
  };

  const onValueChange = (path: (string | number)[], type: SimpleType, value: any) => {
    const jsonPath = createJsonPath(path);
    let parsedValue = value;
    try {
      if (type === 'number') {
        parsedValue = parseFloat(value as string) || 0;
      }
    } catch (err) {
      log.catch(err);
      parsedValue = undefined;
    }

    const newValues = { ...setValue(values, jsonPath, parsedValue) };
    setValues(newValues);
    setChanged((prev) => ({ ...prev, [jsonPath]: true }));
    onValuesChanged?.(newValues);

    const isValid = validate(newValues);
    if (isValid && onValid) {
      onValid(newValues, { changed });
    }
  };

  const onTouched = useCallback(
    (path: (string | number)[]) => {
      const jsonPath = createJsonPath(path);
      setTouched((touched) => ({ ...touched, [jsonPath]: true }));
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
    onTouched,
  } satisfies FormHandler<T>;
};

const createKeySet = <T extends BaseObject, V>(obj: T, value: V): Record<JsonPath, V> => {
  invariant(obj);
  return Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<JsonPath, V>);
};

const flatMap = (errors: ValidationError[]) => {
  return errors.reduce(
    (result, { path, message }) => {
      // Convert the validation error path format to our JsonPath format
      const jsonPath = fromEffectValidationPath(path);
      if (!(jsonPath in result)) {
        result[jsonPath] = message;
      }
      return result;
    },
    {} as Record<JsonPath, string>,
  );
};
