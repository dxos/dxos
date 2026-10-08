//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { FONT_FAMILIES, type FontFamily, NodeStyle } from '../../model/types.ts';

const FAMILY_LABELS: Record<FontFamily, string> = { normal: 'Normal', monospace: 'Monospace' };

const FAMILIES = FONT_FAMILIES.map((value) => ({ value, label: FAMILY_LABELS[value] }));

/** The editor's readable range; stored sizes outside it are kept, not checked. */
const FONT_SIZE = { min: 8, max: 80, step: 1 };

/**
 * The text face and size, rendered at `style.fontFamily`: the two side by side in one row (`style.fontSize` is
 * hidden), each change writing the enclosing `style`, as the alignment row does.
 */
export const FontField: FormFieldRenderer = ({ jsonPath, readonly, onBlur }) => {
  const stylePath = (jsonPath ?? 'style.fontFamily').split('.').slice(0, -1);
  const styleField = useFormFieldState('FontField', stylePath);
  const style: NodeStyle = styleField.getValue() ?? {};
  const update = (values: Partial<NodeStyle>) => {
    // A pick or a stepper press never blurs, so each change commits itself.
    styleField.onValueChange(NodeStyle.ast, { ...style, ...values });
    onBlur();
  };
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
      <Form.Field path={jsonPath} label='Font' readonly={readonly}>
        <SelectControl
          items={FAMILIES}
          value={style.fontFamily ?? 'normal'}
          readonly={readonly}
          onValueChange={(next) => {
            const fontFamily = FONT_FAMILIES.find((family) => family === next);
            // The body face is the default, so it is stored as unset.
            update({ fontFamily: fontFamily === 'normal' ? undefined : fontFamily });
          }}
        />
      </Form.Field>
      <Form.Field path={[...stylePath, 'fontSize'].join('.')} label='Font size' readonly={readonly}>
        <Input.Number
          disabled={!!readonly}
          {...FONT_SIZE}
          formatOptions={{ maximumFractionDigits: 0 }}
          value={style.fontSize === undefined ? '' : String(style.fontSize)}
          onValueChange={(_, fontSize) => {
            if (!Number.isNaN(fontSize)) {
              update({ fontSize });
            }
          }}
        />
      </Form.Field>
    </Layout.Container>
  );
};
