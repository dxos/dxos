//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useEffect, useState } from 'react';

import { Input, type TextInputProps } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { type FormFieldRendererProps } from '#types';

import { FormFieldWrapper } from '../../FormFieldWrapper';

/**
 * Extracts numeric constraints (`minimum`/`maximum` bounds and whether the value must be an integer)
 * by walking the chain of Refinement ASTs and reading each one's JSON schema annotation (e.g. produced
 * by `Schema.between` / `Schema.int`). Returns empty constraints when none are declared.
 */
export const getNumericConstraints = (ast: SchemaAST.AST): { min?: number; max?: number; integer: boolean } => {
  let node: SchemaAST.AST | undefined = ast;
  let min: number | undefined;
  let max: number | undefined;
  let integer = false;
  // Nested refinements (e.g. `Schema.int()` + `Schema.between()`) each carry their own JSON schema
  // fragment, so accumulate across the chain rather than reading only the outermost node.
  while (node && SchemaAST.isRefinement(node)) {
    const jsonSchema = Option.getOrUndefined(SchemaAST.getJSONSchemaAnnotation(node));
    if (jsonSchema != null) {
      if (min === undefined && 'minimum' in jsonSchema && typeof jsonSchema.minimum === 'number') {
        min = jsonSchema.minimum;
      }
      if (max === undefined && 'maximum' in jsonSchema && typeof jsonSchema.maximum === 'number') {
        max = jsonSchema.maximum;
      }
      if (
        ('type' in jsonSchema && jsonSchema.type === 'integer') ||
        ('multipleOf' in jsonSchema && jsonSchema.multipleOf === 1)
      ) {
        integer = true;
      }
    }
    node = node.from;
  }
  return { min, max, integer };
};

export const NumberField = ({
  type,
  readonly,
  placeholder,
  getValue,
  onValueChange,
  onBlur,
  ...props
}: FormFieldRendererProps<number>) => {
  const { min, max, integer } = getNumericConstraints(type);

  // Clamp to the declared bounds (and round when integer) so the committed value respects the schema's
  // natural limits — `<input type="number">`'s min/max only constrain the spinner, not typed input.
  const clamp = useCallback(
    (n: number) => {
      let value = integer ? Math.round(n) : n;
      if (min !== undefined) {
        value = Math.max(min, value);
      }
      if (max !== undefined) {
        value = Math.min(max, value);
      }
      return value;
    },
    [min, max, integer],
  );

  // Track raw string input so the user can clear the field before typing a new number.
  // We only commit to onValueChange when the raw string parses to a valid number.
  const [raw, setRaw] = useState<string>(() => {
    const v = getValue();
    return v !== undefined ? String(v) : '';
  });

  // Sync display when an external change updates the committed value (e.g. reactive form
  // calculations). Only overwrite raw when the external value differs from what raw parses
  // to, preserving partial edits like "1." which correctly parse to 1.
  const externalValue = getValue();
  useEffect(() => {
    if (externalValue !== safeParseFloat(raw)) {
      setRaw(externalValue !== undefined ? String(externalValue) : '');
    }
  }, [externalValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback<NonNullable<TextInputProps['onChange']>>(
    (event) => {
      const value = event.target.value;
      setRaw(value);
      const parsed = safeParseFloat(value);
      if (parsed !== undefined) {
        onValueChange(type, clamp(parsed));
      }
    },
    [type, onValueChange, clamp],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      // If the field was left empty or invalid, reset to the last committed value.
      if (safeParseFloat(raw) === undefined) {
        const committed = getValue();
        setRaw(committed !== undefined ? String(committed) : '');
      }
      onBlur(event);
    },
    [raw, getValue, onBlur],
  );

  return (
    <FormFieldWrapper<number> readonly={readonly} getValue={getValue} {...props}>
      {() => (
        <Input.TextInput
          type='number'
          disabled={!!readonly}
          placeholder={placeholder}
          value={raw}
          min={min}
          max={max}
          step={integer ? 1 : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      )}
    </FormFieldWrapper>
  );
};
