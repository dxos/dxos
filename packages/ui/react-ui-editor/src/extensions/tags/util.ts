//
// Copyright 2025 DXOS.org
//

import { type Range } from '@codemirror/state';
import { type Decoration, type DecorationSet } from '@codemirror/view';

// TODO(burdon): Util.
export const decoSetToArray = (deco: DecorationSet): readonly Range<Decoration>[] => {
  const ranges: Range<Decoration>[] = [];
  const iter = deco.iter();
  while (iter.value) {
    ranges.push({
      from: iter.from,
      to: iter.to,
      value: iter.value,
    });
    iter.next();
  }

  return ranges;
};
