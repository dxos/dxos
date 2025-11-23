//
// Copyright 2024 DXOS.org
//

import { Format } from '@dxos/echo';
import { type SimpleType } from '@dxos/effect';

import { GeoPointInput } from './custom';
import { BooleanInput, MarkdownInput, NumberInput, TextInput } from './Defaults';
import { type InputComponent } from './Input';

/**
 * Get property input component.
 */
export const getInputComponent = (type: SimpleType, format?: Format.Format | string): InputComponent | undefined => {
  switch (format) {
    case Format.TypeFormat.GeoPoint:
      return GeoPointInput;
    case Format.TypeFormat.Markdown:
      return MarkdownInput;
  }

  switch (type) {
    case 'string':
      return TextInput;
    case 'number':
      return NumberInput;
    case 'boolean':
      return BooleanInput;
  }
};
