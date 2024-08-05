//
// Copyright 2024 DXOS.org
//

import { type TextRange } from '../typeahead/types';

export const insertItemModifier = ({
  item,
  text,
  textRange,
}: {
  item: string;
  text: string | null;
  textRange: TextRange | null;
}): string => {
  if (text !== null && textRange !== null) {
    if (text.charAt(textRange.endOffset + 1) === '(') {
      return item;
    }
  }

  return `${item}(`;
};
