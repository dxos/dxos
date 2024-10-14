//
// Copyright 2024 DXOS.org
//

import { FieldValueType } from '@dxos/react-ui-data';
import { type ClassNameValue } from '@dxos/react-ui-types';

import { type SheetModel } from './sheet-model';
import { type CellAddress, inRange } from '../defs';
import { addressToIndex, rangeFromIndex } from '../defs';

export type CellFormat = {
  value?: string;
  classNames?: ClassNameValue;
};

/**
 * @deprecated See react-ui-data.
 */
export class FormattingModel {
  constructor(private readonly _model: SheetModel) {}

  /**
   * Get formatted string value and className for cell.
   */
  getFormatting(cell: CellAddress): CellFormat {
    const value = this._model.getValue(cell);
    if (value === undefined || value === null) {
      return {};
    }

    // TODO(burdon): Locale.
    const locales = undefined;

    // Cell-specific formatting.
    const idx = addressToIndex(this._model.sheet, cell);
    let formatting = this._model.sheet.formatting?.[idx] ?? {};
    const classNames = [...(formatting?.classNames ?? [])];

    // Range formatting.
    // TODO(burdon): NOTE: D0 means the D column.
    // TODO(burdon): Cache model formatting (e.g., for ranges). Create class out of this function.
    for (const [idx, _formatting] of Object.entries(this._model.sheet.formatting)) {
      const range = rangeFromIndex(this._model.sheet, idx);
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

    const type = formatting?.type ?? this._model.getValueType(cell);
    switch (type) {
      case FieldValueType.Boolean: {
        return {
          value: (value as boolean).toLocaleString().toUpperCase(),
          classNames: [...classNames, value ? '!text-greenText' : '!text-orangeText'],
        };
      }

      //
      // Numbers.
      //

      case FieldValueType.Number: {
        return { value: value.toLocaleString(locales), classNames: [...classNames, defaultNumber] };
      }

      case FieldValueType.Percent: {
        return { value: (value as number) * 100 + '%', classNames: [...classNames, defaultNumber] };
      }

      case FieldValueType.Currency: {
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

      case FieldValueType.DateTime: {
        const date = this._model.toLocalDate(value as number);
        return { value: date.toLocaleString(locales), classNames };
      }

      case FieldValueType.Date: {
        const date = this._model.toLocalDate(value as number);
        return { value: date.toLocaleDateString(locales), classNames };
      }

      case FieldValueType.Time: {
        const date = this._model.toLocalDate(value as number);
        return { value: date.toLocaleTimeString(locales), classNames };
      }

      default: {
        return { value: String(value), classNames };
      }
    }
  }
}
