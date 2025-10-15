//
// Copyright 2024 DXOS.org
//

import { FormatEnum } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';

import { GeoPointInput } from './custom';
import { BooleanInput, MarkdownInput, NumberInput, TextInput } from './Defaults';
import { type InputComponent } from './Input';

/**
 * Get property input component.
 */
export const getInputComponent = (type: SimpleType, format?: FormatEnum | string): InputComponent | undefined => {
  switch (format) {
    case FormatEnum.GeoPoint:
      return GeoPointInput;
    case FormatEnum.Markdown:
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
