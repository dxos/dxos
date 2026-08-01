//
// Copyright 2025 DXOS.org
//

import * as Equal from 'effect/Equal';
import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import * as Utils from 'effect/Utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Ref } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useDefaultValue } from '@dxos/react-ui';
import { type ValidationError, validateSchema } from '@dxos/schema';
import { type MaybePromise } from '@dxos/util';

import { type FormFieldStatus } from '#types';

/**
 * Form properties.
 */
export interface FormHandlerProps<T extends AnyProperties> {
  /**
   * Effect schema (Type literal).
   */
  schema?: Schema.Schema<T, any>;

  /**
   * Source values. Fields the user is not editing reflect this value; in-progress edits (including intermediate
   * invalid values) are held locally and never snap back until they are committed and the source catches up. Persist
   * committed values from `onValuesChanged`/`onSave`. The form re-renders when a new value is passed, so to reflect
   * external/remote mutations pass a reactive source (e.g. a `useObject` snapshot that changes on mutation) rather
   * than a raw live object — a render-time read of an ECHO object does not itself subscribe to it.
   */
  values?: Partial<T>;

  /**
   * Seeds an uncontrolled form once at mount when `values` is not provided; not reconciled thereafter.
   */
  defaultValues?: Partial<T>;

  /**
   * Auto-save the form when the values change.
   */
  autoSave?: boolean;

  /**
   * Callback for value changes. Note: This is called even when values are invalid.
   * Sometimes the parent component may want to know about changes even if the form is
   * in an invalid state.
   */
  onValuesChanged?: (values: Partial<T>, meta: FormUpdateMeta<T>) => void;

  /**
   * Custom validation function that runs only after schema validation passes.
   * Use this for complex validation logic that can't be expressed in the schema.
   * @returns Array of validation errors, or undefined if validation passes
   */
  onValidate?: (values: T) => ValidationError[] | undefined;

  /**
   * Called when the form is submitted and passes validation.
   */
  onSave?: (values: T, meta: FormUpdateMeta<T>) => MaybePromise<void>;

  /**
   * Called when the form is canceled.
   */
  onCancel?: () => void;
}

export type FormUpdateMeta<T extends AnyProperties> = {
  changed: FormHandler<T>['changed'];
  isValid: boolean;
};

/**
 * Form handler properties and methods.
 */
export type FormHandler<T extends AnyProperties> = Pick<FormHandlerProps<T>, 'schema' | 'autoSave'> & {
  /** Initial values (which may not pass validation). */
  values: Partial<T>;

  /** Fields whose value has been edited (set by `onValueChange`). Gates autosave-on-blur. */
  changed: Record<SchemaEx.JsonPath, boolean>;
  /** Fields the user has interacted with (set by `onBlur`). Gates error *visibility* — errors only surface once touched. */
  touched: Record<SchemaEx.JsonPath, boolean>;

  /** Map of error strings. */
  errors: Record<SchemaEx.JsonPath, string>;

  /** Whether the values pass validation (no errors at all). */
  isValid: boolean;
  /**
   * Whether the submit affordance should be enabled. Stricter than `isValid`: it also requires no save
   * in flight (`saving`) and only blocks on errors for *touched* fields, so a pristine form with
   * not-yet-touched required fields can still show an enabled control.
   */
  canSave: boolean;

  onSave: () => void;
  onCancel: () => void;

  //
  // Form field state management
  //

  getStatus: (path: string | (string | number)[]) => FormFieldStatus;
  getValue: <V>(path: (string | number)[]) => V | undefined;
  onBlur: (path: (string | number)[]) => void;
  onValueChange: <V>(path: (string | number)[], type: SchemaAST.AST, value: V) => void;
};

/**
 * Creates a hook for managing form state, including values, validation, and submission.
 * Deeply integrated with `@dxos/schema` for schema-based validation.
 */
export const useFormHandler = <T extends AnyProperties>({
  schema,
  autoSave,
  values: valuesProp,
  defaultValues: defaultValuesProp,
  onValuesChanged,
  onValidate,
  onSave,
  onCancel,
  ...props
}: FormHandlerProps<T>): FormHandler<T> => {
  const [changed, setChanged] = useState<Record<SchemaEx.JsonPath, boolean>>({});
  const [touched, setTouched] = useState<Record<SchemaEx.JsonPath, boolean>>({});
  const [errors, setErrors] = useState<Record<SchemaEx.JsonPath, string>>({});
  const [saving, setSaving] = useState(false);
  const defaultValues = useDefaultValue<Partial<T>>(defaultValuesProp, () => ({}));

  // The source the form reads from for every field the user is not actively editing. The form is a pure function of
  // this value and re-renders when the parent passes a new one; to reflect external/remote mutations the parent must
  // supply a reactive source (e.g. a `useObject` snapshot that changes on mutation). `defaultValues` seeds an
  // uncontrolled form once when no `values` are provided.
  const source = valuesProp ?? defaultValues;

  // Sparse local edits keyed by json-path. A path stays here — holding even an intermediate invalid value, so it
  // never snaps back — until the source catches up to it (typically once a valid edit has been persisted and echoed
  // back through `values`). Un-edited paths are never buffered, so they always reflect the current source.
  const [overrides, setOverrides] = useState<Record<SchemaEx.JsonPath, unknown>>({});

  // Merged view (source overlaid with local edits) for whole-form consumers: validation, save, and context/debug.
  // Computed each render (not memoized) so it stays fresh when the source value changes.
  const values = applyOverrides(source, overrides);

  // Validate.
  const validate = useCallback(
    (values: Partial<T>): values is T => {
      if (!schema) {
        return false;
      }

      let errors: ValidationError[] = validateSchema(schema, values) ?? [];
      log('validate', { values, errors });
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
  }, [validate, values, schemaChanged]);

  // Drop an override once the source has caught up to it (the committed value has been echoed back), so the field
  // returns to reflecting the source. Edits the source has not yet reflected — including intermediate invalid values,
  // and in-progress edits to a field that changed remotely — are kept, so the form never snaps back. Runs on every
  // render (a new source value re-renders the form), reconciling against whatever the source currently holds.
  useEffect(() => {
    const reconciled = (Object.keys(overrides) as SchemaEx.JsonPath[]).filter((path) =>
      valuesEqual(SchemaEx.getValue(source, path), overrides[path]),
    );
    if (reconciled.length === 0) {
      return;
    }
    setOverrides((prev) => omitPaths(prev, reconciled));
    setChanged((prev) => omitPaths(prev, reconciled));
    setTouched((prev) => omitPaths(prev, reconciled));
  });

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  /**
   * NOTE: We can submit if there is no touched field that has an error.
   * If there's a validation message visible in the form, submit should be disabled.
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
        await onSave?.(values, { changed, isValid });
      } finally {
        setSaving(false);
      }
    }
  }, [values, validate, onSave, changed, isValid]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  //
  // Fields.
  //

  const getStatus = useCallback<FormHandler<T>['getStatus']>(
    (path) => {
      const jsonPath = Array.isArray(path) ? SchemaEx.createJsonPath(path) : path;
      const [_, error] =
        Object.entries(errors).find(
          ([errorPath]) =>
            errorPath === jsonPath || errorPath.startsWith(`${jsonPath}.`) || errorPath.startsWith(`${jsonPath}[`),
        ) ?? [];

      // Only show errors for touched fields.
      const isTouched = touched[jsonPath as SchemaEx.JsonPath];
      if (!isTouched) {
        return {
          status: undefined,
          error: undefined,
        };
      }

      return {
        status: error ? 'error' : undefined,
        error: error ? (error ?? undefined) : undefined,
      };
    },
    [errors, touched],
  );

  const getValue = useCallback<FormHandler<T>['getValue']>(
    (path) => {
      const jsonPath = SchemaEx.createJsonPath(path);
      if (Object.prototype.hasOwnProperty.call(overrides, jsonPath)) {
        return overrides[jsonPath] as any;
      }
      // Un-edited fields reflect the current source value.
      return SchemaEx.getValue(source, jsonPath);
    },
    [source, overrides],
  );

  const onValueChange = useCallback<FormHandler<T>['onValueChange']>(
    (path, type, value) => {
      log('onValueChange', { path, value });

      const jsonPath = SchemaEx.createJsonPath(path);
      const pathArray = path;
      let parsedValue = value as any;
      try {
        if (type._tag === 'NumberKeyword') {
          parsedValue = parseFloat(value as string) || 0;
        }
      } catch (err) {
        log.catch(err);
        parsedValue = undefined;
      }

      // Hold the edit locally as an override (including invalid values, so it never snaps back); un-edited paths keep
      // tracking the live source. The prune effect drops the override once the source catches up.
      const newOverrides = { ...overrides, [jsonPath]: parsedValue };
      setOverrides(newOverrides);

      // TODO(burdon): Check value has changed from original.
      const newChanged = { [jsonPath]: true };
      setChanged((prev) => ({ ...prev, ...newChanged }));

      // Merged values for validation and the callback. Form never mutates the source; the parent persists.
      const newValues = applyOverrides(source, newOverrides);

      // Validate.
      const isValid = validate(newValues);

      // Notify parent; parent is responsible for persisting the change (typically once valid).
      onValuesChanged?.(newValues, { isValid, changed: newChanged });
    },
    [source, overrides, validate, onValuesChanged],
  );

  const onBlur = useCallback(
    async (path: (string | number)[]) => {
      const jsonPath = SchemaEx.createJsonPath(path);

      // TODO(burdon): Check value has changed from original.
      setTouched((touched) => ({ ...touched, [jsonPath]: true }));
      const isValid = validate(values);

      // Auto-save when a field is blurred and is valid.
      if (Object.keys(changed).length > 0 && isValid && autoSave) {
        await onSave?.(values as T, { changed, isValid });
      }
    },
    [validate, values, changed, autoSave, onSave],
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
      autoSave,

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
      autoSave,
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
      handleSave,
      handleCancel,
    ],
  );
};

/**
 * Creates a new object with value at path. Does not mutate source.
 * Preserves arrays when path segments are numeric indices.
 */
const mergeAtPath = (obj: any, path: readonly (string | number)[], value: any): any => {
  if (path.length === 0) {
    return value;
  }

  const [head, ...rest] = path;
  const child = rest.length === 0 ? value : mergeAtPath(obj?.[head], rest, value);

  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head as number] = child;
    return copy;
  }

  return { ...obj, [head]: child };
};

/** Overlays sparse json-path edits onto a base value without mutating it; un-edited paths keep the base reference. */
const applyOverrides = <T>(base: Partial<T>, overrides: Record<SchemaEx.JsonPath, unknown>): Partial<T> => {
  let result: Partial<T> = base;
  for (const path of Object.keys(overrides) as SchemaEx.JsonPath[]) {
    result = mergeAtPath(result, SchemaEx.splitJsonPath(path), overrides[path]) as Partial<T>;
  }
  return result;
};

// Copied from `@dxos/echo` (internal `Obj.valuesEqual`): references compare by target URI, arrays and plain
// object-shaped property bags (excluding `id`) compare recursively, and leaves fall back to Effect `Equal.equals`
// inside a structural region. Effect's `Schema.equivalence` is not a safe substitute — it returns false-positive
// equality for dynamic/union/ref-array schemas, which would silently prune edits.
// TODO(wittjosiah): Factor out into a shared util rather than duplicating echo's internal implementation.
const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (left === null || right === null) {
    return left === right;
  }
  if (typeof left !== 'object' || typeof right !== 'object') {
    return Utils.structuralRegion(() => Equal.equals(left, right));
  }
  if (Ref.isRef(left) && Ref.isRef(right)) {
    return left.uri === right.uri;
  }
  if (Ref.isRef(left) || Ref.isRef(right)) {
    return false;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => valuesEqual(value, right[index]));
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([
    ...Object.keys(leftRecord).filter((key) => key !== 'id'),
    ...Object.keys(rightRecord).filter((key) => key !== 'id'),
  ]);
  for (const key of keys) {
    if (!valuesEqual(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }
  return true;
};

/** Returns a copy of `record` without the given json-path keys. */
const omitPaths = <V>(
  record: Record<SchemaEx.JsonPath, V>,
  paths: SchemaEx.JsonPath[],
): Record<SchemaEx.JsonPath, V> => {
  const omit = new Set<string>(paths);
  return Object.fromEntries(Object.entries(record).filter(([key]) => !omit.has(key))) as Record<SchemaEx.JsonPath, V>;
};

const flatMap = (errors: ValidationError[]) => {
  return errors.reduce(
    (result, { path, message }) => {
      // Convert the validation error path format to our SchemaEx.JsonPath format.
      const jsonPath = SchemaEx.fromEffectValidationPath(path);
      if (!(jsonPath in result)) {
        result[jsonPath] = message;
      }
      return result;
    },
    {} as Record<SchemaEx.JsonPath, string>,
  );
};
