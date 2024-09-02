//
// Copyright 2024 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui-types';

import { type SheetModel, type CellAddress, inRange } from '../../model';
import { ValueTypeEnum } from '../../types';

export class FormattingModel {
  constructor(private readonly model: SheetModel) {}

  /**
   * Get formatted string value and className for cell.
   */
  getFormatting(cell: CellAddress): { value?: string; classNames?: ClassNameValue } {
    const value = this.model.getValue(cell);
    if (value === undefined || value === null) {
      return {};
    }

    // TODO(burdon): Locale.
    const locales = undefined;

    // Cell-specific formatting.
    const idx = this.model.addressToIndex(cell);
    let formatting = this.model.sheet.formatting?.[idx] ?? {};
    const classNames = [...(formatting?.classNames ?? [])];

    // Range formatting.
    // TODO(burdon): NOTE: D0 means the D column.
    // TODO(burdon): Cache model formatting (e.g., for ranges). Create class out of this function.
    for (const [idx, _formatting] of Object.entries(this.model.sheet.formatting)) {
      const range = this.model.rangeFromIndex(idx);
      if (inRange(range, cell)) {
        if (_formatting.classNames) {
          classNames.push(..._formatting.classNames);
        }

        // TODO(burdon): Last wins.
        if (_formatting.type) {
          formatting = _formatting;
        }
      }
    }

    const defaultNumber = 'justify-end font-mono';

    const type = formatting?.type ?? this.model.getValueType(cell);
    switch (type) {
      case ValueTypeEnum.Boolean: {
        return {
          value: (value as boolean).toLocaleString().toUpperCase(),
          classNames: [...classNames, value ? '!text-green-500' : '!text-orange-500'],
        };
      }

      //
      // Numbers.
      //

      case ValueTypeEnum.Number: {
        return { value: value.toLocaleString(locales), classNames: [...classNames, defaultNumber] };
      }

      case ValueTypeEnum.Percent: {
        return { value: (value as number) * 100 + '%', classNames: [...classNames, defaultNumber] };
      }

      case ValueTypeEnum.Currency: {
        return {
          value: (value as number).toLocaleString(locales, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          classNames: [...classNames, defaultNumber],
        };
      }

      //
      // Dates.
      //

      case ValueTypeEnum.DateTime: {
        const date = this.model.toLocalDate(value as number);
        return { value: date.toLocaleString(locales), classNames };
      }

      case ValueTypeEnum.Date: {
        const date = this.model.toLocalDate(value as number);
        return { value: date.toLocaleDateString(locales), classNames };
      }

      case ValueTypeEnum.Time: {
        const date = this.model.toLocalDate(value as number);
        return { value: date.toLocaleTimeString(locales), classNames };
      }

      default: {
        return { value: String(value), classNames };
      }
    }
  }
}
