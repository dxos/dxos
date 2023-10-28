//
// Copyright 2023 DXOS.org
//

import { type Icon, Buildings, Folders, User } from '@phosphor-icons/react';
import React, { type FC, forwardRef } from 'react';

import { Card, ScrollArea } from '@dxos/react-ui';
import { type MosaicTileComponent, Mosaic } from '@dxos/react-ui-mosaic';
import { groupSurface, mx } from '@dxos/react-ui-theme';

import { type SearchResult } from '../../search';

// TODO(burdon): Factor out.
const styles = {
  hover: 'hover:bg-neutral-50 dark:hover:bg-neutral-800',
  selected: '!bg-teal-100 !dark:bg-teal-900',
};

// TODO(burdon): Registry defined by plugins?
const getIcon = (type: string): Icon | undefined => {
  const iconMap: Record<string, Icon> = {
    user: User,
    organization: Buildings,
    project: Folders,
  };

  return iconMap[type];
};

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

export const SearchItem: MosaicTileComponent<SearchItemProps> = forwardRef(
  ({ draggableStyle, draggableProps, item }, forwardRef) => {
    const { id, type, label, snippet, match, selected, onSelect } = item;
    const Icon = type ? getIcon(type) : undefined;

    return (
      <Card.Root
        ref={forwardRef}
        style={draggableStyle}
        classNames={mx('mx-2 mt-2 cursor-pointer', styles.hover, selected && styles.selected)}
        onClick={() => onSelect?.(id)}
      >
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={label ?? 'Untitled'} />
          {Icon && <Card.Endcap Icon={Icon} />}
        </Card.Header>
        {snippet && (
          <Card.Body gutter>
            <Snippet text={snippet} match={match} />
          </Card.Body>
        )}
      </Card.Root>
    );
  },
);

export type SearchResultsProps = {
  match?: RegExp;
  items: SearchResult[];
  selected?: string;
  onSelect?: (id: string) => void;
};

// TODO(burdon): Key cursor up/down.
export const SearchResults = ({ items, selected, onSelect }: SearchResultsProps) => {
  const path = 'search';
  return (
    <ScrollArea.Root classNames={['grow', groupSurface]}>
      <ScrollArea.Viewport>
        <div className='flex flex-col'>
          <Mosaic.Container id={path} Component={SearchItem}>
            {items.map((item) => (
              <Mosaic.DraggableTile
                key={item.id}
                path={path}
                item={{ ...item, selected: selected === item.id, onSelect }}
                Component={SearchItem}
              />
            ))}
          </Mosaic.Container>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};
