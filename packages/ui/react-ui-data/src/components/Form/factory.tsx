//
// Copyright 2024 DXOS.org
//

import { FormatEnum } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';

import { LatLngInput } from './Custom';
import { BooleanInput, NumberInput, TextInput } from './Defaults';
import { type InputComponent } from '../../hooks';

/**
 * Get property input component.
 */
export const getInputComponent = <T extends object>(
  type: SimpleType,
  format?: FormatEnum,
): InputComponent<T> | undefined => {
  switch (format) {
    case FormatEnum.LatLng:
      return LatLngInput;
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
