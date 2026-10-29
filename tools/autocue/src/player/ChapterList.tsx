//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Listbox from '@dxos/react-ui/Listbox';

import { type Chapter } from './types.ts';
import { formatClock } from './usePlayback.ts';

export type ChapterListProps = {
  chapters: Chapter[];
  current: number;
  onSelect: (index: number) => void;
};

/** The take's steps in order; the one under the playhead is current, and choosing one seeks to it. */
export const ChapterList = ({ chapters, current, onSelect }: ChapterListProps) => {
  const items = useMemo<Listbox.Option[]>(
    () =>
      chapters.map((chapter, index) => ({
        value: String(index),
        label: chapter.title,
        description: chapter.subtitle,
      })),
    [chapters],
  );

  return (
    <Listbox.Root
      items={items}
      value={current >= 0 ? [String(current)] : []}
      onValueChange={(value) => value[0] !== undefined && onSelect(Number(value[0]))}
      aria-label='Chapters'
    >
      <Listbox.Content>
        {items.length === 0 && <Listbox.Empty>This demo has no chapters.</Listbox.Empty>}
        {items.map((item, index) => (
          <Listbox.Item key={item.value} item={item} current={index === current} highlightOnHover>
            <span className='text-center font-mono text-sm text-fg-muted tabular-nums'>{index + 1}</span>
            <Listbox.ItemText />
            {item.description && <Listbox.ItemDescription />}
            <span className='pe-2 font-mono text-sm text-fg-muted tabular-nums'>{formatClock(chapters[index].at)}</span>
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
