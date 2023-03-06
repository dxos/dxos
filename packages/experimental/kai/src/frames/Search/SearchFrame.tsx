//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { Searchbar } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';

// TODO(burdon): Based on schema.
const searchFields = ['title', 'name', 'description', 'content'];

// TODO(burdon): Match fields.
const textFilter = (text: string) => (object: Document) => true;

const getTitle = (object: Document) => (object as any).title ?? (object as any).name;

export const SearchFrame = () => {
  // TODO(burdon): Search across spaces.
  const [text, setText] = useState<string>('');
  const handleSearch = (text: string) => {
    setText(text);
  };

  const { space } = useAppRouter();
  const objects = useQuery(space).filter(textFilter(text));

  return (
    // TODO(burdon): Frame container.
    <div className='flex flex-1 overflow-hidden justify-center'>
      <div className='flex flex-col overflow-hidden w-[400px] shadow bg-white m-2'>
        <div className='flex justify-center p-4'>
          <Searchbar onSearch={handleSearch} />
        </div>
        <div className='flex flex-1 overflow-hidden overflow-y-scroll'>
          <div className='flex flex-col w-full'>
            {objects.map((object) => (
              // TODO(burdon): Title (mapper), snippet, Icon (and link), rank.
              <div key={object.id} className='p-4 border-b'>
                {getTitle(object)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
