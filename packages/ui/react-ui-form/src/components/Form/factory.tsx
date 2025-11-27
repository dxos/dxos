//
// Copyright 2024 DXOS.org
//

import { Format } from '@dxos/echo/internal';
import { type SimpleType } from '@dxos/effect';

import { BooleanField, GeoPointField, MarkdownField, NumberField, TextField } from './fields';
import { type FormFieldComponent } from './FormFieldComponent';

/**
 * Get property input component.
 */
export const getInputComponent = (
  type: SimpleType,
  format?: Format.TypeFormat | string,
): FormFieldComponent | undefined => {
  switch (format) {
    case Format.TypeFormat.GeoPoint:
      return GeoPointField;
    case Format.TypeFormat.Markdown:
      return MarkdownField;
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
