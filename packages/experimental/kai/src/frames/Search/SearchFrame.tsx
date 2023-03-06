//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useQuery } from '@dxos/react-client';
import { Searchbar } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';

// TODO(burdon): Based on schema.
const textFilter = () => true;

export const SearchFrame = () => {
  // TODO(burdon): Search across spaces.
  const [text, setText] = useState<string>();
  const handleSearch = (text: string) => {
    setText(text);
  };

  const { space } = useAppRouter();
  const objects = useQuery(space).filter(textFilter);

  return (
    // TODO(burdon): Frame container.
    <div className='flex flex-1 justify-center'>
      <div className='flex flex-col w-[400px] bg-white m-2 p-2'>
        <div className='flex justify-center p-4'>
          <Searchbar onSearch={handleSearch} />
        </div>
        <div className='flex flex-1 overflow-hidden overflow-y-scroll'>
          <div className='flex flex-col'>
            {objects.map((object) => (
              // TODO(burdon): Icon.
              <div key={object.id} className='p-2 border-b'>
                {JSON.stringify(object)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
