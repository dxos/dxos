//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Form } from '@dxos/react-ui-form';

import { type GenerationService } from '#types';

export type GenerateFormProps = GenerationService.GenerationFormProps;

/**
 * Default request-config form: a schema-driven form rendered from the provider's `requestSchema`. A
 * provider may supply its own form via `GenerationService.Form` (inlined by the studio article).
 * When `readonly`, the values are shown but not editable.
 */
export const GenerateForm = ({ schema, value, onChange, readonly }: GenerateFormProps) => {
  const handleValuesChanged = useCallback(
    (next: Record<string, unknown>) => {
      onChange?.(next);
    },
    [onChange],
  );

  return (
    <Form.Root
      schema={schema}
      values={value}
      readonly={readonly}
      // Keep every field visible when read-only (show the full form, not just the set fields).
      keepEmptyReadonly={readonly}
      autoSave={!readonly}
      onValuesChanged={readonly ? undefined : handleValuesChanged}
    >
      <Form.Content>
        <Form.FieldSet />
      </Form.Content>
    </Form.Root>
  );
};

GenerateForm.displayName = 'GenerateForm';
