//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type SelectOption } from '@dxos/react-ui';
import { hues } from '@dxos/ui-types';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { SelectControl } from './SelectField.tsx';

const capitalize = (hue: string) => hue.charAt(0).toUpperCase() + hue.slice(1);

/** Every theme hue as a Select option: a filled swatch in the hue, named by the hue. */
export const HUE_OPTIONS: SelectOption[] = hues.map((hue) => ({
  value: hue,
  label: capitalize(hue),
  icon: 'ph--circle--fill',
  iconHue: hue,
}));

export type HueSelectProps = {
  value?: string;
  placeholder?: string;
  readonly?: boolean;
  onValueChange: (hue: string | undefined) => void;
};

/** A Select over the theme hues; the current `HuePicker` (react-ui-pickers) has no Next counterpart yet. */
export const HueSelect = ({ value, placeholder, readonly, onValueChange }: HueSelectProps) => (
  <SelectControl
    items={HUE_OPTIONS}
    value={value}
    placeholder={placeholder}
    readonly={readonly}
    onValueChange={onValueChange}
  />
);

/** A field whose value is one of the theme's hues. */
export const HueField = ({
  type,
  format,
  placeholder,
  readonly,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string | undefined>) => {
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value && capitalize(value)} format={format} />;
  }

  return (
    <HueSelect
      value={value}
      placeholder={placeholder}
      readonly={readonly}
      onValueChange={(hue) => {
        // A pick is a commit: the select never blurs, so it commits itself.
        onValueChange(type, hue);
        onBlur();
      }}
    />
  );
};
