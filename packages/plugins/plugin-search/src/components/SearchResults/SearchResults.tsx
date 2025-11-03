//
// Copyright 2023 DXOS.org
//

import React, { type FC, forwardRef } from 'react';

import { Card } from '@dxos/react-ui-stack';
import { ghostHover } from '@dxos/react-ui-theme';

import { SEARCH_RESULT } from '../../meta';
import { type SearchResult } from '../../types';

export const Snippet: FC<{ text: string; match?: RegExp }> = ({ text, match }) => {
  let content = <>{text}</>;
  if (match) {
    const result = text.match(match);
    if (result?.index !== undefined) {
      // Break near to match.
      const maxOffset = 16;
      let before = text.slice(0, result.index);
      if (before.length > maxOffset) {
        const idx = before.indexOf(' ', result.index - maxOffset);
        before = '… ' + before.slice(idx);
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

  return <span className='text-xs mb-1 line-clamp-3 text-neutral-300'>{content}</span>;
};

export type SearchItemProps = SearchResult & { selected: boolean } & Pick<SearchResultsProps, 'onSelect'>;

export const SearchItem = forwardRef<HTMLDivElement, SearchItemProps>((item, forwardRef) => {
  const { id, objectType, label, snippet, match, selected, onSelect } = item;

  return (
    <Card.StaticRoot
      ref={forwardRef}
      classNames={['mx-2 mt-2 cursor-pointer', selected && '!bg-activeSurface', ghostHover]}
      onClick={() => onSelect?.(id)}
    >
      {objectType && (
        <>
          <div className='text-xs text-neutral-400 ml-4'>{objectType}</div>
        </>
      )}
      <Card.Heading>{label ?? 'Untitled'}</Card.Heading>
      {snippet && <Snippet text={snippet} match={match} />}
    </Card.StaticRoot>
  );
});

export type SearchResultsProps = {
  match?: RegExp;
  items: SearchResult[];
  selected?: string;
  onSelect?: (id: string) => void;
};

// TODO(burdon): Key cursor up/down.
export const SearchResults = ({ items, selected, onSelect }: SearchResultsProps) => (
  <div className='flex flex-col grow overflow-y-auto'>
    <div className='flex flex-col'>
      {items.map((item) => (
        <SearchItem key={item.id} type={SEARCH_RESULT} {...item} onSelect={onSelect} selected={selected === item.id} />
      ))}
    </div>
  </div>
);
