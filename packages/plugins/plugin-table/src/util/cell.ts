//
// Copyright 2024 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';
import { FieldValueType } from '@dxos/schema';

export const tableCellClassesForFieldType = (type: FieldValueType): string | undefined => {
  switch (type) {
    case FieldValueType.Number:
      return mx('text-right font-mono');
    case FieldValueType.Boolean:
      return mx('text-right font-mono');
    case FieldValueType.String:
    case FieldValueType.Text:
      return;
    case FieldValueType.Timestamp:
    case FieldValueType.DateTime:
    case FieldValueType.Date:
    case FieldValueType.Time:
      return mx('font-mono');
    case FieldValueType.Percent:
      return mx('text-right');
    case FieldValueType.Currency:
      return mx('text-right');
    case FieldValueType.JSON:
      return mx('font-mono');
    default:
      return undefined;
  }
};
