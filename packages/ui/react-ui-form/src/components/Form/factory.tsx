//
// Copyright 2024 DXOS.org
//

import { type BaseObject, FormatEnum } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';

import { BooleanInput, NumberInput, TextInput } from './Defaults';
import { type InputComponent } from './Input';
import { GeoPointInput } from './custom';

/**
 * Get property input component.
 */
export const getInputComponent = <T extends BaseObject>(
  type: SimpleType,
  format?: FormatEnum,
): InputComponent<T> | undefined => {
  switch (format) {
    case FormatEnum.LatLng:
      return GeoPointInput;
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
