//
// Copyright 2024 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui-types';

import { type CellAddress, type SheetModel } from '../../model';
import { ValueFormatEnum } from '../../types';

/**
 * https://hyperformula.handsontable.com/api/interfaces/configparams.html#nulldate
 */
export const nullDate = { year: 1899, month: 12, day: 30 };

// TODO(burdon): Cache model formatting (e.g., for ranges).
// TODO(burdon): NOTE: D0 means the entire D column.

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

  const formatting = model.sheet.formatting?.[model.getCellIndex(cell)] ?? {};
  const defaultClassName = [...(formatting?.classNames ?? [])];

  const type = model.getValueType(cell);
  switch (type) {
    case ValueFormatEnum.Boolean: {
      return {
        value: (value as boolean).toLocaleString().toUpperCase(),
        classNames: [...defaultClassName, value ? '!text-green-500' : '!text-orange-500'],
      };
    }

    case ValueFormatEnum.Number: {
      return { value: value.toLocaleString(), classNames: [...defaultClassName, 'justify-end font-mono'] };
    }

    case ValueFormatEnum.Percent: {
      return { value: (value as number) * 100 + '%', classNames: [...defaultClassName, 'justify-end font-mono'] };
    }

    case ValueFormatEnum.DateTime: {
      const date = model.toLocalDate(value as number);
      return { value: date.toLocaleString(), classNames: defaultClassName };
    }

    case ValueFormatEnum.Date: {
      const date = model.toLocalDate(value as number);
      return { value: date.toLocaleDateString(), classNames: defaultClassName };
    }

    case ValueFormatEnum.Time: {
      const date = model.toLocalDate(value as number);
      return { value: date.toLocaleTimeString(), classNames: defaultClassName };
    }

    default: {
      return { value: String(value), classNames: defaultClassName };
    }
  }
};
