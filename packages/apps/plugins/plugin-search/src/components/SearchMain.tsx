//
// Copyright 2023 DXOS.org
//

import { File } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { List, ListItem, ScrollArea } from '@dxos/aurora';
import { getSize, groupSurface, mx } from '@dxos/aurora-theme';

import { Searchbar } from './Searchbar';

export type SearchResult<T = {}> = {
  id: string;
  title: string;
  document: T;
};

export type SearchMainProps<T> = {
  onSearch?: (text: string) => Promise<SearchResult<T>[]>;
};

export const SearchMain = <T extends {}>({ onSearch }: SearchMainProps<T>) => {
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const handleSearch = (text: string) => {
    setTimeout(async () => {
      setResults((await onSearch?.(text)) ?? []);
    });
  };

  return (
    <div className={mx('flex flex-col h-full overflow-hidden', groupSurface)}>
      <Searchbar onSearch={handleSearch} />
      <ResultList results={results} />
    </div>
  );
};

const ResultList: FC<{ results: SearchResult[] }> = ({ results }) => {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <List>
          {results.map(({ id, title }) => (
            <ListItem.Root key={id} classNames='flex overflow-hidden'>
              <ListItem.Endcap>
                <File className={mx(getSize(5), 'mbs-2')} />
              </ListItem.Endcap>
              <ListItem.Heading classNames='truncate pbs-1.5 cursor-pointer'>{title}</ListItem.Heading>
              <ListItem.Endcap />
            </ListItem.Root>
          ))}
        </List>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
