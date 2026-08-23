//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Word } from '#types';

export type WordListProps = ThemedClassName<{
  words: Word.Word[];
  /** Highlighted row (e.g. the card currently being drilled). */
  selected?: string;
  onSelect?: (word: Word.Word) => void;
}>;

/**
 * Deck contents: term, translation and drill progress, one row per word.
 * Presentation only — the deck order comes from the caller, which owns the query.
 */
export const WordList = ({ words, selected, onSelect, classNames }: WordListProps) => {
  if (words.length === 0) {
    return null;
  }

  // Selectable rows are options in a listbox, not items in a list: the selection has to be carried by
  // `aria-selected` rather than by a background colour, and the row has to be reachable and operable
  // from the keyboard. Without `onSelect` the rows are inert, and a plain list is the honest role.
  const interactive = Boolean(onSelect);

  return (
    <div role={interactive ? 'listbox' : 'list'} className={mx('flex flex-col divide-y divide-separator', classNames)}>
      {words.map((word) => (
        <div
          role={interactive ? 'option' : 'listitem'}
          key={word.id}
          {...(interactive && {
            'aria-selected': selected === word.id,
            // Roving focus would be better with many rows, but every option being tabbable is
            // correct before that and never traps the user.
            'tabIndex': 0,
            'onKeyDown': (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(word);
              }
            },
          })}
          className={mx(
            'grid grid-cols-[1fr_1fr_auto] items-baseline gap-3 p-2',
            onSelect && 'cursor-pointer hover:bg-hover-surface dx-focus-ring-inset',
            selected === word.id && 'bg-current-surface',
          )}
          onClick={onSelect && (() => onSelect(word))}
        >
          <span className='truncate'>
            {word.term}
            {word.reading && <span className='pl-2 text-description text-sm'>{word.reading}</span>}
          </span>
          <span className='truncate text-description'>{word.translation}</span>
          <ProgressPips word={word} />
        </div>
      ))}
    </div>
  );
};

WordList.displayName = 'WordList';

/** Leitner box as filled pips: the drill's only persistent per-word signal. */
const ProgressPips = ({ word }: { word: Word.Word }) => {
  const box = word.progress?.box ?? 0;
  return (
    <span className='flex items-center gap-1' title={`${box}/${Word.BOX_COUNT}`}>
      {Array.from({ length: Word.BOX_COUNT }, (_, index) => (
        <Icon
          key={index}
          icon={index < box ? 'ph--circle--fill' : 'ph--circle--regular'}
          size={2}
          classNames={index < box ? 'text-accent-text' : 'text-subdued'}
        />
      ))}
    </span>
  );
};
