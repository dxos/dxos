//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useSceneLook } from '@dxos/react-ui-canvas';
import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE, FONT_SLOTS, LINK_FONT_SIZE, Style2D } from '@dxos/scene';

/** What the slots every theme has are called; any other slot reads by its own name. */
const SLOT_LABELS: Readonly<Record<string, string>> = { body: 'Default', mono: 'Monospace' };

const slotLabel = (slot: string): string => SLOT_LABELS[slot] ?? slot.charAt(0).toUpperCase() + slot.slice(1);

/** The editor's readable range; stored sizes outside it are kept, not checked. */
const FONT_SIZE = { min: 8, max: 80, step: 1 };

/**
 * The text face and size, rendered at `overrides.font`: the two side by side in one row (`overrides.fontSize` is
 * hidden). The faces are the theme's font slots: those every theme has, then any more the canvas's theme defines.
 * Each writes only its own path, so an edit across a selection leaves each element's other style values.
 */
export const FontField: FormFieldRenderer = ({ jsonPath, readonly }) => {
  const stylePath = (jsonPath ?? 'overrides.font').split('.').slice(0, -1);
  const fontField = useFormFieldState('FontField', [...stylePath, 'font']);
  const stored: unknown = fontField.getValue();
  const font = typeof stored === 'string' ? stored : DEFAULT_FONT;
  const { theme } = useSceneLook();
  const items = useMemo(
    // A stored slot the theme does not define is still listed, so the select shows what the element says.
    () =>
      [...new Set([...FONT_SLOTS, ...Object.keys(theme.fonts ?? {}), font])].map((value) => ({
        value,
        label: slotLabel(value),
      })),
    [theme.fonts, font],
  );
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
          items={items}
          value={font}
          readonly={readonly}
          onValueChange={(next) => {
            // The body face is the default, so it is stored as unset; a pick never blurs, so it commits itself.
            fontField.onValueChange(Style2D.fields.font.ast, next === DEFAULT_FONT ? undefined : next);
            fontField.onBlur();
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
            sizeField.onValueChange(Style2D.fields.fontSize.ast, fontSize);
            sizeField.onBlur();
          }
        }}
      />
    </Form.Field>
  );
};

/** The caption size alone, rendered at `overrides.fontSize` when a link is selected, since a link has no font face. */
export const FontSizeField: FormFieldRenderer = ({ jsonPath, readonly }) => (
  <FontSizeControl path={(jsonPath ?? 'overrides.fontSize').split('.')} fallback={LINK_FONT_SIZE} readonly={readonly} />
);
