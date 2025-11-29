//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type AnyProperties, getValue as getValue$, setValue as setValue$ } from '@dxos/echo/internal';
import { type JsonPath, type SimpleType, createJsonPath, fromEffectValidationPath } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ValidationError, adaptValidationMessage, validateSchema } from '@dxos/schema';
import { type MaybePromise } from '@dxos/util';

export type FormFieldStatus = {
  status?: 'error';
  error?: string;
};

/**
 * Form properties.
 */
export interface FormHandlerProps<T extends AnyProperties> {
  /**
   * Effect schema (Type literal).
   */
  schema?: Schema.Schema<T, any>;

  /**
   * Initial values (which may not pass validation).
   */
  values?: Partial<T>;

  /**
   * Callback for value changes. Note: This is called even when values are invalid.
   * Sometimes the parent component may want to know about changes even if the form is
   * in an invalid state.
   */
  onValuesChanged?: (values: Partial<T>, meta: { isValid: boolean; changed: FormHandler<T>['changed'] }) => void;

  /**
   * Custom validation function that runs only after schema validation passes.
   * Use this for complex validation logic that can't be expressed in the schema.
   * @returns Array of validation errors, or undefined if validation passes
   */
  // TODO(burdon): Change to key x value?
  onValidate?: (values: T) => ValidationError[] | undefined;

  /**
   * Called when the form is submitted and passes validation.
   */
  onSave?: (values: T, meta: { changed: FormHandler<T>['changed'] }) => MaybePromise<void>;

  /**
   * Called when the form is canceled.
   */
  onCancel?: () => void;
}

/**
 * Form handler properties and methods.
 */
export type FormHandler<T extends AnyProperties> = Pick<FormHandlerProps<T>, 'schema'> & {
  /** Initial values (which may not pass validation). */
  values: Partial<T>;

  /** Map of error strings. */
  errors: Record<JsonPath, string>;

  /** Map of touched fields. */
  touched: Record<JsonPath, boolean>;

  // TODO(burdon): How is this different from above?
  changed: Record<JsonPath, boolean>;

  // TODO(burdon): How is this different from below?
  isValid: boolean;

  /** Whether the form can be saved (i.e., data is valid). */
  canSave: boolean;

  onSave: () => void;
  onCancel: () => void;

  //
  // Form field state management
  //

  getStatus: (path: string | (string | number)[]) => FormFieldStatus;
  getValue: <V>(path: (string | number)[]) => V | undefined;
  onBlur: (path: (string | number)[]) => void;
  onValueChange: <V>(path: (string | number)[], type: SimpleType, value: V) => void;
};

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 * Deeply integrated with `@dxos/schema` for schema-based validation.
 */
export const useFormHandler = <T extends AnyProperties>({
  schema,
  values: valuesProp,
  onValuesChanged,
  onValidate,
  onSave,
  onCancel,
  ...props
}: FormHandlerProps<T>): FormHandler<T> => {
  // TODO(burdon): Change to useControlledValue.
  const [values, setValues] = useState<Partial<T>>(valuesProp ?? {});
  useEffect(() => {
    setValues(valuesProp ?? {});
  }, [valuesProp]);

  const [touched, setTouched] = useState<Record<JsonPath, boolean>>(createKeySet(valuesProp ?? {}, false));
  const [changed, setChanged] = useState<Record<JsonPath, boolean>>(createKeySet(valuesProp ?? {}, false));
  const [errors, setErrors] = useState<Record<JsonPath, string>>({});
  const [saving, setSaving] = useState(false);

  //
  // Validation.
  //

  const validate = useCallback(
    (values: Partial<T>): values is T => {
      if (!schema) {
        return false;
      }

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
  const [schemaChanged, setSchemaChanged] = useState(false);
  useEffect(() => setSchemaChanged(true), [schema]);
  useEffect(() => {
    if (schemaChanged) {
      validate(values);
      setSchemaChanged(false);
    }
  }, [values, schemaChanged]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  /**
   * NOTE: We can submit if there is no touched field that has an error.
   * Basically, if there's a validation message visible in the form, submit should be disabled.
   */
  const canSave = useMemo(
    () =>
      !saving &&
      // Check if any error paths that are touched have errors.
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

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  //
  // Fields.
  //

  const getStatus = useCallback<FormHandler<T>['getStatus']>(
    (path) => {
      const jsonPath = Array.isArray(path) ? createJsonPath(path) : path;
      const [_, error] =
        Object.entries(errors).find(
          ([errorPath]) =>
            errorPath === jsonPath || errorPath.startsWith(`${jsonPath}.`) || errorPath.startsWith(`${jsonPath}[`),
        ) ?? [];

      // Only show errors for touched fields.
      const isTouched = touched[jsonPath as JsonPath];
      if (!isTouched) {
        return {
          status: undefined,
          error: undefined,
        };
      }

      return {
        status: error ? 'error' : undefined,
        error: error ? (adaptValidationMessage(error) ?? undefined) : undefined,
      };
    },
    [errors, touched],
  );

  const getValue = useCallback<FormHandler<T>['getValue']>(
    <V>(path: (string | number)[]): V | undefined => {
      return getValue$(values, createJsonPath(path));
    },
    [values],
  );

  const onValueChange = useCallback<FormHandler<T>['onValueChange']>(
    (path: (string | number)[], type: SimpleType, value: any) => {
      log('onValueChange', { path, type, value });

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

      // Update.
      const newValues = { ...setValue$(values, jsonPath, parsedValue) };
      setValues(newValues);
      const newChanged = { ...changed, [jsonPath]: true };
      setChanged({ ...changed, [jsonPath]: true });

      // Validate.
      const isValid = validate(newValues);

      // Callback.
      onValuesChanged?.(newValues, { isValid, changed: newChanged });
    },
    [values, changed, validate, onValuesChanged],
  );

  const onBlur = useCallback(
    (path: (string | number)[]) => {
      const jsonPath = createJsonPath(path);
      setTouched((touched) => ({ ...touched, [jsonPath]: true }));
      validate(values);
    },
    [validate, values],
  );

  return useMemo<FormHandler<T>>(
    () => ({
      // State.
      schema,
      values,
      errors,
      touched,
      changed,
      isValid,
      canSave,

      // Actions.
      onSave: handleSave,
      onCancel: handleCancel,

      // Field utils.
      getStatus,
      getValue,
      onBlur,
      onValueChange,

      ...props,
    }),
    [
      schema,
      values,
      errors,
      touched,
      changed,
      canSave,
      isValid,
      getStatus,
      getValue,
      onBlur,
      onValueChange,
      onSave,
      onCancel,
    ],
  );
};

const createKeySet = <T extends AnyProperties, V>(obj: T, value: V): Record<JsonPath, V> => {
  invariant(obj);
  return Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: value }), {} as Record<JsonPath, V>);
};

const flatMap = (errors: ValidationError[]) => {
  return errors.reduce(
    (result, { path, message }) => {
      // Convert the validation error path format to our JsonPath format.
      const jsonPath = fromEffectValidationPath(path);
      if (!(jsonPath in result)) {
        result[jsonPath] = message;
      }
      return result;
    },
    {} as Record<JsonPath, string>,
  );
};
