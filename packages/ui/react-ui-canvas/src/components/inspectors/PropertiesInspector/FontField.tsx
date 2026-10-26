//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { DEFAULT_FONT_SIZE, FONT_FAMILIES, type FontFamily, LINK_FONT_SIZE, NodeStyle } from '../../../model/index.ts';

const FAMILY_LABELS: Record<FontFamily, string> = { default: 'Default', monospace: 'Monospace' };

const FAMILIES = FONT_FAMILIES.map((value) => ({ value, label: FAMILY_LABELS[value] }));

/** The editor's readable range; stored sizes outside it are kept, not checked. */
const FONT_SIZE = { min: 8, max: 80, step: 1 };

/**
 * The text face and size, rendered at `style.fontFamily`: the two side by side in one row (`style.fontSize` is
 * hidden). Each writes only its own path, so an edit across a selection leaves each element's other style values.
 */
export const FontField: FormFieldRenderer = ({ jsonPath, readonly }) => {
  const stylePath = (jsonPath ?? 'style.fontFamily').split('.').slice(0, -1);
  const familyField = useFormFieldState('FontField', [...stylePath, 'fontFamily']);
  const family: unknown = familyField.getValue();
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
          value={typeof family === 'string' ? family : 'default'}
          readonly={readonly}
          onValueChange={(next) => {
            const fontFamily = FONT_FAMILIES.find((family) => family === next);
            // The body face is the default, so it is stored as unset; a pick never blurs, so it commits itself.
            familyField.onValueChange(
              NodeStyle.fields.fontFamily.ast,
              fontFamily === 'default' ? undefined : fontFamily,
            );
            familyField.onBlur();
          }}
        />
      </Form.Field>
      <FontSizeControl path={[...stylePath, 'fontSize']} fallback={DEFAULT_FONT_SIZE} readonly={readonly} />
    </Layout.Container>
  );
};

type FontSizeControlProps = { path: string[]; fallback: number; readonly?: boolean };

/** A text size stepper; unset shows `fallback`, the size the element draws at. */
const FontSizeControl = ({ path, fallback, readonly }: FontSizeControlProps) => {
  const sizeField = useFormFieldState('FontSizeControl', path);
  const size: unknown = sizeField.getValue();
  return (
    <Form.Field path={path.join('.')} label='Font size' readonly={readonly}>
      <Input.Number
        disabled={!!readonly}
        {...FONT_SIZE}
        formatOptions={{ maximumFractionDigits: 0 }}
        value={String(typeof size === 'number' ? size : fallback)}
        onValueChange={(_, fontSize) => {
          if (!Number.isNaN(fontSize)) {
            // A stepper press never blurs, so each value commits itself.
            sizeField.onValueChange(NodeStyle.fields.fontSize.ast, fontSize);
            sizeField.onBlur();
          }
        }}
      />
    </Form.Field>
  );
};

/** The caption size alone, rendered at `style.fontSize` when a link is selected, since a link has no font face. */
export const FontSizeField: FormFieldRenderer = ({ jsonPath, readonly }) => (
  <FontSizeControl path={(jsonPath ?? 'style.fontSize').split('.')} fallback={LINK_FONT_SIZE} readonly={readonly} />
);
