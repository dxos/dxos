//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as ColorPicker from '@dxos/react-ui/ColorPicker';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

/** A CSS color typed as text, with a swatch at the end of the box that opens a picker. */
export const ColorField = ({
  type,
  format,
  placeholder,
  readonly,
  presentation,
  jsonPath,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<string | undefined>) => {
  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  return (
    <ColorPicker.Root
      value={value}
      disabled={!!readonly}
      onValueChange={(next) => onValueChange(type, next)}
      // The picker's popover never blurs the box, so ending a pick commits it.
      onValueCommit={() => onBlur()}
    >
      <ColorPicker.Input placeholder={placeholder} data-testid={jsonPath} end={<ColorPicker.Trigger />} />
    </ColorPicker.Root>
  );
};
