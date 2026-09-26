//
// Copyright 2026 DXOS.org
//

import React from 'react';

export type DiffStatProps = { added: number; removed: number };

/** `+12 -3`, coloured as the diff gutters are, with a zero count left out. */
export const DiffStat = ({ added, removed }: DiffStatProps) => (
  <span className='flex items-center gap-1 ps-2 text-xs tabular-nums whitespace-nowrap'>
    {added > 0 && <span className='text-(--color-cm-diff-add-gutter)'>+{added}</span>}
    {removed > 0 && <span className='text-(--color-cm-diff-remove-gutter)'>-{removed}</span>}
  </span>
);
