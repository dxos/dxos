//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { NodeBase } from '../../../model/index.ts';
import { MAX_PORTS_PER_SIDE } from '../../../utils/index.ts';

type NumberControlProps = {
  path: string[];
  label: string;
  /** Shown while the value is unset: what the node draws with. */
  fallback: number;
  range: { min: number; max: number; step: number };
  field: typeof NodeBase.fields.rotation | typeof NodeBase.fields.portsPerSide;
  readonly?: boolean;
};

const NumberControl = ({ path, label, fallback, range, field: schema, readonly }: NumberControlProps) => {
  const field = useFormFieldState('FrameField', path);
  const value: unknown = field.getValue();
  return (
    <Form.Field path={path.join('.')} label={label} readonly={readonly}>
      <Input.Number
        disabled={!!readonly}
        {...range}
        formatOptions={{ maximumFractionDigits: 0 }}
        value={String(typeof value === 'number' ? value : fallback)}
        onValueChange={(_, next) => {
          if (!Number.isNaN(next)) {
            // A stepper press never blurs, so each value commits itself.
            field.onValueChange(schema.ast, next);
            field.onBlur();
          }
        }}
      />
    </Form.Field>
  );
};

/**
 * Rotation and ports per side, rendered at `rotation`: the two side by side in one row (`portsPerSide` is hidden).
 * Each writes only its own path, so an edit across a selection leaves each element's other values.
 */
export const FrameField: FormFieldRenderer = ({ jsonPath, readonly }) => {
  const base = (jsonPath ?? 'rotation').split('.').slice(0, -1);
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
      <NumberControl
        path={[...base, 'rotation']}
        label='Rotation'
        fallback={0}
        range={{ min: -360, max: 360, step: 15 }}
        field={NodeBase.fields.rotation}
        readonly={readonly}
      />
      <NumberControl
        path={[...base, 'portsPerSide']}
        label='Ports per side'
        fallback={1}
        range={{ min: 1, max: MAX_PORTS_PER_SIDE, step: 1 }}
        field={NodeBase.fields.portsPerSide}
        readonly={readonly}
      />
    </Layout.Container>
  );
};
