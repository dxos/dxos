//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ScrollContainer } from './ScrollContainer';

const TAGS = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

const List = () => {
  return (
    <div className='flex shrink-0 w-[200px] h-[300px] rounded border shadow'>
      <ScrollContainer vertical>
        <div className='py-[15px] px-5'>
          <div className='text-[15px] leading-[18px] font-medium text-sky-700'>Tags</div>
          {TAGS.map((tag) => (
            <div key={tag} className='text-[13px] leading-[18px] mt-2.5 pt-2.5 border-t text-sky-500 border-sky-100'>
              {tag}
            </div>
          ))}
        </div>
      </ScrollContainer>
    </div>
  );
};

const Lists = ({ count = 10 }) => {
  return (
    <div className='flex w-[400px] border'>
      <ScrollContainer horizontal>
        <div className='flex p-4 space-x-2'>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className='flex flex-col items-center justify-center w-[80px] h-[80px] bg-white border'>
              {i}
            </div>
          ))}
        </div>
      </ScrollContainer>
    </div>
  );
};

export default {
  component: ScrollContainer,
  decorators: [
    withTheme,
    (Story: any) => (
      <div className='flex flex-col w-full h-screen justify-center items-center bg-white'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Vertical = {
  render: () => <List />,
};

export const Horizontal = {
  render: () => <Lists />,
};
