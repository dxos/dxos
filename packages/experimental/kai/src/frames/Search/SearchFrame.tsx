//
// Copyright 2023 DXOS.org
//

import { Bag, Buildings, Calendar, Check, Circle, Envelope, FileText, UserCircle } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, Searchbar } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';

// TODO(burdon): Factor out.
const iconMap: { [key: string]: FC<any> } = {
  'dxos.experimental.kai.Organization': Buildings,
  'dxos.experimental.kai.Project': Bag,
  'dxos.experimental.kai.Task': Check,
  'dxos.experimental.kai.Contact': UserCircle,
  'dxos.experimental.kai.Event': Calendar,
  'dxos.experimental.kai.Document': FileText,
  'dxos.experimental.kai.Message': Envelope
};

// TODO(burdon): Based on schema. Convert documents. to text.
const searchFields = ['title', 'name', 'description', 'content', 'subject', 'body'];

type SearchResult = {
  object: Document;
  rank: number;
  Icon: FC<any>;
  title: string;
  snippet?: string[];
};

// TODO(burdon): Ranking via Lyra?
// TODO(burdon):
const mapResult = (text: string) => {
  const str = text.trim().toLowerCase();
  return (object: Document): SearchResult | undefined => {
    if (!str.length) {
      return;
    }

    if (object.__typename) {
      // TODO(burdon): Title fields.
      const title = (object as any).title ?? (object as any).name ?? (object as any).subject;

      let match = false;
      let snippet: string[] = [];
      for (const field of searchFields) {
        const value = (object as { [key: string]: string | undefined })[field];
        if (typeof value === 'string') {
          const idx = value?.toLowerCase().indexOf(str) ?? -1;
          if (idx !== -1) {
            match = true;
            if (value !== title) {
              snippet = [
                value.slice(Math.max(0, idx - 16), idx),
                value.slice(idx, idx + str.length),
                value.slice(idx + str.length)
              ];
            }
            break;
          }
        }
      }

      if (!match) {
        return;
      }

      if (title) {
        return {
          object,
          rank: 1,
          title,
          snippet,
          Icon: iconMap[object.__typename] ?? Circle
        };
      }
    }
  };
};

const sort = ({ rank: a }: SearchResult, { rank: b }: SearchResult) => (a < b ? -1 : a > b ? 1 : 0);

// TODO(burdon): Factor out search panel (with callback).
export const SearchFrame = () => {
  // TODO(burdon): Search across spaces.
  // TODO(burdon): Throttle.
  const [text, setText] = useState<string>('');
  const handleSearch = (text: string) => {
    setText(text);
  };

  const { space } = useAppRouter();
  const results = useQuery(space).map(mapResult(text)).filter(Boolean) as SearchResult[];
  const sorted = results.sort(sort);

  const handleSelect = (object: Document) => {
    console.log(object.id);
  };

  return (
    // TODO(burdon): Frame container (same as Tasks).
    <main className='min-bs-full flex-1 overflow-hidden justify-center p-0 md:p-4'>
      <div
        role='none'
        className='flex flex-col flex-1 overflow-hidden min-bs-full mli-auto is-full md:is-column bg-paper-bg shadow-1'
      >
        <div className='flex justify-center p-4'>
          <Searchbar slots={{ input: { autoFocus: true, className: 'border-b' } }} onSearch={handleSearch} />
        </div>

        <div className='flex flex-1 overflow-hidden overflow-y-scroll'>
          <div className='flex flex-col w-full'>
            {sorted.map(({ object, Icon, title, snippet }, i) => (
              <div
                key={i}
                className='flex flex-col w-full px-4 py-2 hover:bg-hover-bg cursor-pointer border-b'
                onClick={() => handleSelect(object)}
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
                    <div className='w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm text-zinc-400'>
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
    </main>
  );
};
