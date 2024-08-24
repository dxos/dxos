//
// Copyright 2024 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui-types';

import { type CellScalar, CellTypeEnum, type Formatting } from '../../types';

/**
 * Get formatted string value and className for cell.
 */
export const getFormatting = (
  value: CellScalar | undefined,
  formatting?: Formatting | undefined,
): { value?: string; classNames?: ClassNameValue } => {
  if (value === undefined || value === null) {
    return {};
  }

  const defaultClassName = ['px-2 py-1 items-start', ...(formatting?.classNames ?? [])];
  const type = formatting?.type ?? inferType(value);
  switch (type) {
    case CellTypeEnum.Number: {
      return { value: value.toLocaleString(), classNames: [...defaultClassName, 'justify-end font-mono'] };
    }

    // TODO(burdon): =TODAY() => 45528?
    // https://hyperformula.handsontable.com/guide/date-and-time-handling.html#example
    case CellTypeEnum.Date: {
      return { value: value.toLocaleString(), classNames: [...defaultClassName, 'justify-end'] };
    }

    default: {
      return { value: String(value), classNames: defaultClassName };
    }
  }
};

const inferType = (value: CellScalar): CellTypeEnum | undefined => {
  if (typeof value === 'number') {
    return CellTypeEnum.Number;
  }

  if (typeof value === 'string') {
    return CellTypeEnum.String;
  }
};
