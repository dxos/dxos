//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import { DEFAULT_HULL_SHAPE, HULL_SHAPES, HullNode } from '@dxos/scene';

const SHAPE_LABELS: Record<(typeof HULL_SHAPES)[number], string> = { perimeter: 'Perimeter', box: 'Box' };
const SHAPES = HULL_SHAPES.map((value) => ({ value, label: SHAPE_LABELS[value] }));

/**
 * A hull's border and its inset side by side in one row, rendered at `shape` (`inset` is hidden). Each shows what
 * the hull draws with while unset: a perimeter, on its line.
 */
export const HullField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const base = (jsonPath ?? 'shape').split('.').slice(0, -1);
  const inset = useFormFieldState('HullField', [...base, 'inset']);
  const shape: unknown = getValue();
  const count: unknown = inset.getValue();
  return (
    <Layout.Container
      layout='row'
      gutter='inherit'
      align='start'
      gap='md'
      columns='repeat(2, minmax(0, 1fr))'
      // The properties panel is narrow, and the two controls fit side by side there, so the row never stacks.
      fixed
    >
      <Form.Field path={jsonPath} label={label} readonly={readonly}>
        <SelectControl
          items={SHAPES}
          value={typeof shape === 'string' ? shape : DEFAULT_HULL_SHAPE}
          readonly={readonly}
          onValueChange={(next) => {
            // A choice is a commit: the select never blurs, so it commits itself.
            onValueChange(type, next);
            onBlur();
          }}
        />
      </Form.Field>
      <Form.Field path={[...base, 'inset'].join('.')} label='Inset' readonly={readonly}>
        <Input.Number
          disabled={!!readonly}
          min={0}
          step={1}
          formatOptions={{ maximumFractionDigits: 0 }}
          value={String(typeof count === 'number' ? count : 0)}
          onValueChange={(_, next) => {
            if (!Number.isNaN(next)) {
              // A stepper press never blurs, so each value commits itself.
              inset.onValueChange(HullNode.fields.inset.ast, next);
              inset.onBlur();
            }
          }}
        />
      </Form.Field>
    </Layout.Container>
  );
};
