//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Listbox from '@dxos/react-ui/Listbox';

import { type Chapter } from './types.ts';
import { formatClock } from './usePlayback.ts';

export type ChapterListProps = {
  chapters: Chapter[];
  /** Index of the chapter under the playhead; -1 is the intro, before the first chapter. */
  current: number;
  /** Seeks to a chapter; -1 seeks to the start (the intro). */
  onSelect: (index: number) => void;
};

const INTRO = 'intro';

/**
 * The take's steps in order, after an Intro row for whatever plays before the first one (setup, an open title); the row
 * under the playhead is current, and choosing one seeks to it.
 */
export const ChapterList = ({ chapters, current, onSelect }: ChapterListProps) => {
  const hasIntro = (chapters[0]?.at ?? 0) > 0.05;
  const items = useMemo<Listbox.Option[]>(
    () => [
      ...(hasIntro ? [{ value: INTRO, label: 'Intro', description: 'Setup before the first step' }] : []),
      ...chapters.map((chapter, index) => ({
        value: String(index),
        label: chapter.title,
        description: chapter.subtitle,
      })),
    ],
    [chapters, hasIntro],
  );
  const currentValue = current >= 0 ? String(current) : hasIntro ? INTRO : undefined;

  return (
    <Listbox.Root
      items={items}
      value={currentValue ? [currentValue] : []}
      onValueChange={(value) => value[0] !== undefined && onSelect(value[0] === INTRO ? -1 : Number(value[0]))}
      aria-label='Chapters'
    >
      <Listbox.Content>
        {items.length === 0 && <Listbox.Empty>This demo has no chapters.</Listbox.Empty>}
        {items.map((item) => {
          const index = item.value === INTRO ? -1 : Number(item.value);
          return (
            <Listbox.Item key={item.value} item={item} current={item.value === currentValue} highlightOnHover>
              <span className='text-center font-mono text-sm text-fg-muted tabular-nums'>
                {index < 0 ? '·' : index + 1}
              </span>
              <Listbox.ItemText />
              {item.description && <Listbox.ItemDescription />}
              <span className='pe-2 font-mono text-sm text-fg-muted tabular-nums'>
                {formatClock(index < 0 ? 0 : chapters[index].at)}
              </span>
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};
