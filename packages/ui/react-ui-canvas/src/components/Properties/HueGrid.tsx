//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer } from '@dxos/react-ui-form';
import * as Icon from '@dxos/react-ui/Icon';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type NeutralPalette, hues } from '@dxos/ui-types';

/** The group's value for an unset hue: the frame's own neutral look. */
const NONE = 'none';

const capitalize = (hue: string) => hue.charAt(0).toUpperCase() + hue.slice(1);

export type GridHue = NeutralPalette | ChromaticPalette;

/** Neutral first, beside none: the grey a node takes without a theme colour. */
const GRID_HUES: readonly GridHue[] = ['neutral', ...hues];

const isHue = (value: string): value is GridHue => GRID_HUES.some((hue) => hue === value);

/** The pressed item keeps the panel's background; the selection is drawn around the swatch instead. */
const ITEM_CLASSES = 'min-w-0 px-0 aria-checked:bg-transparent aria-checked:hover:bg-hover-surface';

const swatchClasses = (selected: boolean) =>
  mx('rounded-xs', selected && 'outline-2 outline-offset-2 outline-primary-500');

export type HueGridProps = {
  value?: string;
  /** Several nodes disagree: no swatch is selected until one is picked. */
  indeterminate?: boolean;
  readonly?: boolean;
  onValueChange: (hue: GridHue | undefined) => void;
};

/**
 * Every theme hue as a square swatch, plus one for none, all in view at once: a node's colour is picked by
 * eye, so a grid beats a list of names. Unset selects none; a mixed value (several nodes that disagree) selects nothing.
 */
export const HueGrid = ({ value, indeterminate, readonly, onValueChange }: HueGridProps) => {
  const selected = indeterminate ? '' : (value ?? NONE);
  return (
    <ToggleGroup.Root
      type='single'
      classNames='grid grid-cols-10 gap-1'
      value={selected}
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
      <ToggleGroup.Item
        value={NONE}
        variant='ghost'
        classNames={ITEM_CLASSES}
        disabled={readonly}
        data-hue-option={NONE}
      >
        <Icon.Icon
          icon='ph--square--regular'
          tone='muted'
          label='None'
          size='xl'
          classNames={swatchClasses(selected === NONE)}
        />
      </ToggleGroup.Item>
      {GRID_HUES.map((hue) => (
        <ToggleGroup.Item
          key={hue}
          value={hue}
          variant='ghost'
          classNames={ITEM_CLASSES}
          disabled={readonly}
          data-hue-option={hue}
        >
          <Icon.Icon
            icon='ph--square--fill'
            hue={hue}
            label={capitalize(hue)}
            size='xl'
            classNames={swatchClasses(selected === hue)}
          />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
};

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
