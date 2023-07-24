//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { Generator } from '@dxos/kai-types/testing';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { SearchPanel } from './SearchPanel';

export default {
  component: SearchPanel,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const Test = () => {
  const spaces = useSpaces();
  const space = spaces[0];
  useEffect(() => {
    if (space) {
      const generator = new Generator(space.db);
      void generator.generate();
    }
  }, [space]);

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col w-[300px] bg-white'>
      <SearchPanel space={space} onSelect={() => {}} onResults={() => {}} />
    </div>
  );
};

export const Default = {
  render: () => <Test />,
};
