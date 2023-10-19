//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { getSize } from '@dxos/react-ui-theme';
import { Searchbar } from '@dxos/react-appkit';
import { Space, TypedObject } from '@dxos/react-client/echo';

import { SearchResults, useSearch } from '../../hooks';

export type SearchPanelProps = {
  space: Space;
  onResults?: (object: SearchResults) => void;
  onSelect?: (object: TypedObject) => void;
};

export const SearchPanel = ({ space, onResults, onSelect }: SearchPanelProps) => {
  // TODO(burdon): Throttle.
  const [text, setText] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (text: string) => {
    clearTimeout(timeoutRef.current);
    if (text.length) {
      setText(text);
    } else {
      // Delay if empty.
      timeoutRef.current = setTimeout(() => {
        clearTimeout(timeoutRef.current);
        setText('');
      }, 500);
    }
  };

  const results = useSearch(space, text);
  useEffect(() => onResults?.(results), [results]);

  return (
    <div className='flex flex-col shrink-0 overflow-hidden w-full'>
      <div className='flex overflow-hidden items-center p-2'>
        <div className='flex shrink-0 pl-2 pr-1'>
          <MagnifyingGlass className={getSize(6)} />
        </div>
        <Searchbar
          slots={{
            root: { className: 'flex overflow-hidden pl-1', variant: 'subdued' },
            input: { autoFocus: true },
          }}
          onSearch={handleSearch}
        />
      </div>

      <div className='flex flex-1 overflow-y-scroll'>
        <div className='flex flex-col w-full'>
          {results.results.map(({ object, Icon, title, snippet }, i) => (
            <div
              key={i}
              className='flex flex-col w-full px-4 py-2 hover:bg-hover-bg cursor-pointer border-b'
              onClick={() => onSelect?.(object)}
            >
              <div className='flex items-center'>
                <div className='flex w-[40px]'>
                  <Icon weight='thin' className={getSize(6)} />
                </div>
                <div className='w-full text-zinc-600'>{title}</div>
              </div>
              {snippet && snippet.length > 0 && (
                <div className='flex overflow-hidden'>
                  <div className='flex w-[40px]' />
                  <div className='w-full truncate text-sm text-zinc-400'>
                    <span>{snippet[0]}</span>
                    <span className='text-black'>{snippet[1]}</span>
                    <span>{snippet[2]}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
