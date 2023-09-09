//
// Copyright 2023 DXOS.org
//

import { File, List as ListIcon, GridFour as GridIcon } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { Button, ButtonGroup, DensityProvider, List, ListItem, ScrollArea, Toolbar } from '@dxos/aurora';
import { getSize, groupSurface, mx } from '@dxos/aurora-theme';

import { Card } from './Card';
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

  // TODO(burdon): Toolbar.
  // TODO(burdon): Right sidebar: Search/Thread selector.
  const list = false;

  return (
    <div className={mx('flex flex-col h-full overflow-hidden', groupSurface)}>
      <div className='flex flex-col gap-1'>
        <Selector />
        <Searchbar onSearch={handleSearch} />
      </div>
      {(list && <ResultList results={results} />) || <ResultCards results={results} />}
    </div>
  );
};

const Selector = () => {
  return (
    <DensityProvider density='fine'>
      <Toolbar.Root>
        <ButtonGroup>
          <Button>
            <ListIcon className={getSize(4)} />
          </Button>
          <Button>
            <GridIcon className={getSize(4)} />
          </Button>
        </ButtonGroup>
      </Toolbar.Root>
    </DensityProvider>
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

const ResultCards: FC<{ results: SearchResult[] }> = ({ results }) => {
  return (
    <ScrollArea.Root classNames='px-2'>
      <ScrollArea.Viewport>
        <List>
          {results.map(({ id, title, document }) => (
            // TODO(burdon): Map object types onto card sections.
            <Card key={id} id={id} title={title} sections={[{ text: (document as any).content }]} />
          ))}
        </List>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
