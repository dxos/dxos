//
// Copyright 2025 DXOS.org
//

// Presentational component using `react-ui-form` for schema-driven rendering.
// `Form.Root` takes an Effect/Schema and renders fields automatically.
// The schema is derived from the ECHO object schema with `omitId` to exclude the
// internal id field. The status field renders as a select dropdown because the schema
// uses `FormatAnnotation.set(Format.TypeFormat.SingleSelect)` — no custom field needed.

import React, { useCallback, useMemo } from 'react';

import { Form, omitId } from '@dxos/react-ui-form';

import { ExemplarItem } from '#types';

type StatusValue = 'active' | 'archived' | 'draft';

export type ExemplarItemViewProps = {
  name?: string;
  description?: string;
  status?: StatusValue;
  onValuesChanged?: (values: Partial<{ name: string; description: string; status: StatusValue }>) => void;
};

export const ExemplarItemView = ({ name, description, status, onValuesChanged }: ExemplarItemViewProps) => {
  // `omitId` strips the ECHO `id` field from the schema so it doesn't appear in the form.
  const formSchema = useMemo(() => omitId(ExemplarItem.ExemplarItem), []);
  const values = useMemo(() => ({ name, description, status }), [name, description, status]);

  const handleValuesChanged = useCallback(
    (changed: Record<string, unknown>) => {
      onValuesChanged?.(changed as Partial<{ name: string; description: string; status: StatusValue }>);
    },
    [onValuesChanged],
  );

  return (
    <Form.Root schema={formSchema} values={values} onValuesChanged={handleValuesChanged}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
