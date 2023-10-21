//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Card, ScrollArea } from '@dxos/react-ui';
import { inputSurface, mx } from '@dxos/react-ui-theme';

import { type SearchResult } from '../../search';

export type SearchResultsProps = {
  match?: RegExp;
  items: SearchResult[];
  selected?: string;
  onSelect?: (id: string) => void;
};

// TODO(burdon): Key cursor up/down.
export const SearchResults = ({ items, selected, onSelect }: SearchResultsProps) => {
  return (
    <ScrollArea.Root classNames={['grow', inputSurface]}>
      <ScrollArea.Viewport>
        <div className='flex flex-col divide-y'>
          {items.map(({ id, label, match, snippet }) => (
            // TODO(burdon): Draggable.
            <Card.Root
              key={id}
              classNames={mx(
                'shadow-none rounded-none cursor-pointer hover:bg-neutral-50',
                selected === id && 'bg-teal-100',
              )}
              onClick={() => onSelect?.(id)}
            >
              <Card.Header>
                <Card.DragHandle />
                <Card.Title title={label ?? 'Untitled'} />
              </Card.Header>
              {snippet && (
                <Card.Body gutter>
                  <Snippet text={snippet} match={match} />
                </Card.Body>
              )}
            </Card.Root>
          ))}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};

const Snippet: FC<{ text: string; match?: RegExp }> = ({ text, match }) => {
  let content = <>{text}</>;
  if (match) {
    const result = text.match(match);
    if (result?.index !== undefined) {
      // Break near to match.
      const maxOffset = 16;
      let before = text.slice(0, result.index);
      if (before.length > maxOffset) {
        const idx = before.indexOf(' ', result.index - maxOffset);
        before = '... ' + before.slice(idx); // TODO(burdon): Use ellipsis symbol.
      }

      const after = text.slice(result.index + result[0].length);

      content = (
        <>
          {before}
          <span className='text-blue-500'>{result[0]}</span>
          {after}
        </>
      );
    }
  }

  return <span className='text-xs mb-1 line-clamp-2 text-neutral-300'>{content}</span>;
};
