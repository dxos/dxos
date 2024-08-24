//
// Copyright 2024 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui-types';

import { type CellAddress, type SheetModel } from '../../model';
import { ValueFormatEnum } from '../../types';

/**
 * Get formatted string value and className for cell.
 */
export const getFormatting = (
  model: SheetModel,
  cell: CellAddress,
): { value?: string; classNames?: ClassNameValue } => {
  const value = model.getValue(cell);
  if (value === undefined || value === null) {
    return {};
  }

  // TODO(burdon): Locale.
  const locales = undefined;

  // TODO(burdon): Cache model formatting (e.g., for ranges). Create class out of this function.
  // TODO(burdon): NOTE: D0 means the D column.
  const idx = model.getCellIndex(cell);
  const formatting = model.sheet.formatting?.[idx] ?? {};
  const defaultClassName = [...(formatting?.classNames ?? [])];
  const defaultNumber = 'justify-end font-mono';

  const type = model.getValueType(cell);
  switch (type) {
    case ValueFormatEnum.Boolean: {
      return {
        value: (value as boolean).toLocaleString().toUpperCase(),
        classNames: [...defaultClassName, value ? '!text-green-500' : '!text-orange-500'],
      };
    }

    //
    // Numbers.
    //

    case ValueFormatEnum.Number: {
      return { value: value.toLocaleString(locales), classNames: [...defaultClassName, defaultNumber] };
    }

    case ValueFormatEnum.Percent: {
      return { value: (value as number) * 100 + '%', classNames: [...defaultClassName, defaultNumber] };
    }

    case ValueFormatEnum.Currency: {
      return {
        value: (value as number).toLocaleString(locales, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        classNames: [...defaultClassName, defaultNumber],
      };
    }

    //
    // Dates.
    //

    case ValueFormatEnum.DateTime: {
      const date = model.toLocalDate(value as number);
      return { value: date.toLocaleString(locales), classNames: defaultClassName };
    }

    case ValueFormatEnum.Date: {
      const date = model.toLocalDate(value as number);
      return { value: date.toLocaleDateString(locales), classNames: defaultClassName };
    }

    case ValueFormatEnum.Time: {
      const date = model.toLocalDate(value as number);
      return { value: date.toLocaleTimeString(locales), classNames: defaultClassName };
    }

    default: {
      return { value: String(value), classNames: defaultClassName };
    }
  }
};
