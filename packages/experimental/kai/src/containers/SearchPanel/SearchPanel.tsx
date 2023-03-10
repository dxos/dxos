//
// Copyright 2023 DXOS.org
//

import { Bag, Buildings, Calendar, Check, Circle, Envelope, FileText, UserCircle } from 'phosphor-react';
import React, { FC, useRef, useState } from 'react';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, Searchbar } from '@dxos/react-components';

import { FrameDef, frameDefs, useAppRouter } from '../../hooks';

// TODO(burdon): Reconcile with type and frame system.
export const objectMeta: { [key: string]: { rank: number; Icon: FC<any>; frame?: FrameDef } } = {
  'dxos.experimental.kai.Organization': {
    rank: 3,
    Icon: Buildings
  },
  'dxos.experimental.kai.Project': {
    rank: 1,
    Icon: Bag
  },
  'dxos.experimental.kai.Task': {
    rank: 1,
    Icon: Check
  },
  'dxos.experimental.kai.Contact': {
    rank: 3,
    Icon: UserCircle,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.contact')
  },
  'dxos.experimental.kai.Event': {
    rank: 1,
    Icon: Calendar,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.calendar')
  },
  'dxos.experimental.kai.Document': {
    rank: 2,
    Icon: FileText,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.document')
  },
  'dxos.experimental.kai.Message': {
    rank: 1,
    Icon: Envelope,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.inbox')
  }
};

// TODO(burdon): Based on schema. Convert documents. to text.
const searchFields = ['title', 'name', 'description', 'content', 'subject', 'body', 'from.name'];

type SearchResult = {
  object: Document;
  rank: number;
  Icon: FC<any>;
  title: string;
  snippet?: string[];
};

// TODO(burdon): Implement in echo schema.
const getProperty = (object: Object, path: string[]): string | undefined => {
  const value = (object as { [key: string]: any })[path[0]];
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'object') {
    return getProperty(value, path.slice(1));
  }
};

// TODO(burdon): Ranking via Lyra?
const matchFilter = (text: string) => {
  const str = text.trim().toLowerCase();
  return (object: Document): SearchResult | undefined => {
    if (!str.length) {
      return;
    }

    if (object.__typename) {
      // TODO(burdon): Title fields.
      const title = (object as any).title ?? (object as any).name ?? (object as any).subject;

      // TODO(burdon): Factor out search filter.
      let match = false;
      let snippet: string[] = [];
      for (const field of searchFields) {
        const value = getProperty(object, field.split('.'));
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
        const meta = objectMeta[object.__typename];
        if (!meta) {
          return;
        }

        const { rank, Icon = Circle } = meta;
        return {
          object,
          rank,
          title,
          snippet,
          Icon
        };
      }
    }
  };
};

const sort = ({ rank: a }: SearchResult, { rank: b }: SearchResult) => (a < b ? 1 : a > b ? -1 : 0);

export type SearchPanelProps = {
  onSelect?: (object: Document) => void;
};

export const SearchPanel: FC<SearchPanelProps> = ({ onSelect }) => {
  // TODO(burdon): Search across spaces.
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

  const { space } = useAppRouter();
  const results = useQuery(space).map(matchFilter(text)).filter(Boolean) as SearchResult[];
  const sorted = results.sort(sort);

  return (
    <div className='flex flex-col w-full'>
      <div className='flex justify-center p-4'>
        <Searchbar slots={{ input: { autoFocus: true, className: 'border-b' } }} onSearch={handleSearch} />
      </div>

      <div className='flex flex-1 overflow-hidden overflow-y-scroll'>
        <div className='flex flex-col w-full'>
          {sorted.map(({ object, Icon, title, snippet }, i) => (
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
  );
};
