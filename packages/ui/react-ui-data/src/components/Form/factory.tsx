//
// Copyright 2024 DXOS.org
//

import { FormatEnum } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';

import { LatLngInput } from './Custom';
import { BooleanField, NumberField, TextField } from './Defaults';
import { type InputComponent } from '../../hooks';

/**
 * Get property input component.
 */
export const getPropertyInput = <T extends object>(
  type: SimpleType,
  format?: FormatEnum,
): InputComponent<T> | undefined => {
  switch (format) {
    case FormatEnum.LatLng:
      return LatLngInput;
  }

  switch (type) {
    case 'string':
      return TextField;
    case 'number':
      return NumberField;
    case 'boolean':
      return BooleanField;
  }
};
