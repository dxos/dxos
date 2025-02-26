//
// Copyright 2024 DXOS.org
//

import { FormatEnum } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';

import { BooleanInput, MarkdownInput, NumberInput, TextInput } from './Defaults';
import { type InputComponent } from './Input';
import { GeoPointInput } from './custom';

/**
 * Get property input component.
 */
export const getInputComponent = (type: SimpleType, format?: FormatEnum): InputComponent | undefined => {
  switch (format) {
    case FormatEnum.LatLng:
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
