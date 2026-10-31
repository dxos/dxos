//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import { LINE_STYLES, NodeStyle } from '@dxos/scene';

/** Unset: the style set's own line for the element (`borderStyle`), stored as no value. */
const DEFAULT_VALUE = 'default';

const LINE_STYLE_ITEMS = [
  { value: DEFAULT_VALUE, label: 'Default' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

/** The line style, with `Default` (unset) as an option, as the font field offers the body face. */
export const LineStyleField: FormFieldRenderer = ({ jsonPath, label, readonly }) => {
  const field = useFormFieldState('LineStyleField', (jsonPath ?? 'style.lineStyle').split('.'));
  const value: unknown = field.getValue();
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={LINE_STYLE_ITEMS}
        value={typeof value === 'string' ? value : DEFAULT_VALUE}
        readonly={readonly}
        onValueChange={(next) => {
          const lineStyle = LINE_STYLES.find((style) => style === next);
          // A pick never blurs, so it commits itself.
          field.onValueChange(NodeStyle.fields.lineStyle.ast, lineStyle);
          field.onBlur();
        }}
      />
    </Form.Field>
  );
};
