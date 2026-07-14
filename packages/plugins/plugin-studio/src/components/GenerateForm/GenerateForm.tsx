//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { Form } from '@dxos/react-ui-form';

export type GenerateFormProps = {
  /** Effect Schema of the kind-specific request config (the generator's `requestSchema`). */
  schema: Schema.Schema.AnyNoContext;
  /** Current config values. */
  value: Record<string, unknown>;
  /** Called with the updated config on every edit (the form auto-saves). Omit when `readonly`. */
  onChange?: (value: Record<string, unknown>) => void;
  /** Render the values without editing (e.g. a produced variant's recorded params). */
  readonly?: boolean;
};

/**
 * Schema-driven request-config form rendered from the generator's `requestSchema`. When `readonly`,
 * the values are shown (full form) but not editable.
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
