//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer } from '@dxos/react-ui-form';
import * as Icon from '@dxos/react-ui/Icon';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { type ChromaticPalette, hues } from '@dxos/ui-types';

/** The group's value for an unset hue: the frame's own neutral look. */
const NONE = 'none';

const capitalize = (hue: string) => hue.charAt(0).toUpperCase() + hue.slice(1);

const isHue = (value: string): value is ChromaticPalette => hues.some((hue) => hue === value);

export type HueGridProps = {
  value?: string;
  /** Several nodes disagree: no swatch is selected until one is picked. */
  indeterminate?: boolean;
  readonly?: boolean;
  onValueChange: (hue: ChromaticPalette | undefined) => void;
};

/**
 * Every theme hue as a square swatch, plus one for none, all in view at once: a node's colour is picked by
 * eye, so a grid beats a list of names. Unset selects none; a mixed value (several nodes that disagree) selects nothing.
 */
export const HueGrid = ({ value, indeterminate, readonly, onValueChange }: HueGridProps) => (
  <ToggleGroup.Root
    type='single'
    classNames='grid grid-cols-9 gap-1'
    value={indeterminate ? '' : (value ?? NONE)}
    aria-label='Hue'
    data-testid='hue-grid'
    onValueChange={(next) => {
      // Pressing the selected swatch again deselects it in the group; the hue keeps its value.
      if (next === '') {
        return;
      }
      onValueChange(isHue(next) ? next : undefined);
    }}
  >
    <ToggleGroup.Item value={NONE} variant='ghost' disabled={readonly} data-hue-option={NONE}>
      <Icon.Icon icon='ph--square--regular' tone='muted' label='None' size='xl' />
    </ToggleGroup.Item>
    {hues.map((hue) => (
      <ToggleGroup.Item key={hue} value={hue} variant='ghost' disabled={readonly} data-hue-option={hue}>
        <Icon.Icon icon='ph--square--fill' hue={hue} label={capitalize(hue)} size='xl' />
      </ToggleGroup.Item>
    ))}
  </ToggleGroup.Root>
);

/** The properties panel's hue field: the hue grid in place of the form's hue select. */
export const HueGridField: FormFieldRenderer = ({
  type,
  label,
  jsonPath,
  readonly,
  indeterminate,
  getValue,
  onValueChange,
  onBlur,
}) => (
  <Form.Field path={jsonPath} label={label} readonly={readonly}>
    <HueGrid
      value={getValue()}
      indeterminate={indeterminate}
      readonly={!!readonly}
      onValueChange={(hue) => {
        // A pick is a commit: the grid never blurs, so it commits itself.
        onValueChange(type, hue);
        onBlur();
      }}
    />
  </Form.Field>
);
