//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { Form } from '@dxos/react-ui-form';

export type GenerateFormProps = {
  /** Effect Schema of the kind-specific request config (the provider's `requestSchema`). */
  schema: Schema.Schema.AnyNoContext;
  /** Current config values. */
  value: Record<string, unknown>;
  /** Called with the updated config on every edit (the form auto-saves). Omit when `readonly`. */
  onChange?: (value: Record<string, unknown>) => void;
  /** Render the values without editing (e.g. a produced variant's recorded params). */
  readonly?: boolean;
};

/**
 * Default `GenerateForm`: a schema-driven form rendered from the provider's `requestSchema`. A
 * provider may override this per kind with a custom UI via a higher-priority (`Position.first`)
 * surface. When `readonly`, the values are shown but not editable.
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
