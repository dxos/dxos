//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { List, ListItem, ScrollArea } from '@dxos/aurora';
import { getSize, inputSurface, mx } from '@dxos/aurora-theme';

import { type SearchResult } from '../../search';

export type SearchResultsProps = {
  match?: RegExp;
  items: SearchResult[];
  selected?: string;
  onSelect?: (id: string) => void;
};

// TODO(burdon): Key cursor up/down.
export const SearchResults = ({ match, items, selected, onSelect }: SearchResultsProps) => {
  return (
    // TODO(burdon): Truncate doesn't work with ScrollArea (since display:table).
    <ScrollArea.Root classNames={['grow', inputSurface]}>
      <ScrollArea.Viewport>
        <List>
          {items.map(({ id, label, match, snippet, Icon = Circle }) => (
            <ListItem.Root
              key={id}
              // TODO(burdon): Standardize select/hover colors.
              classNames={mx('group cursor-pointer hover:bg-neutral-50', selected === id && '!bg-teal-200')}
              onClick={() => onSelect?.(id)}
            >
              <ListItem.Endcap>
                <Icon
                  className={mx(
                    getSize(5),
                    'mbs-2.5 text-neutral-500 group-hover:text-red-500',
                    selected === id && 'text-red-500',
                  )}
                />
              </ListItem.Endcap>
              <ListItem.Heading classNames='grow pbs-2'>
                <div className='flex flex-col overflow-hidden'>
                  <div className='truncate'>{label}</div>
                  {snippet && <Snippet text={snippet} match={match} />}
                </div>
              </ListItem.Heading>
            </ListItem.Root>
          ))}
        </List>
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
