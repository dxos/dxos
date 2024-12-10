//
// Copyright 2024 DXOS.org
//

import { type BaseObject, FormatEnum } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';

import { GeoPointInput } from './Custom';
import { BooleanInput, NumberInput, TextInput } from './Defaults';
import { type InputComponent } from './Input';

/**
 * Get property input component.
 */
export const getInputComponent = <T extends BaseObject>(
  type: SimpleType,
  format?: FormatEnum,
): InputComponent<T> | undefined => {
  switch (format) {
    case FormatEnum.GeoPoint:
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
