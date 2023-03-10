//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ScrollContainer } from './ScrollContainer';

const TAGS = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

const Test = () => {
  return (
    <ScrollContainer>
      <div className='py-[15px] px-5'>
        <div className='text-[15px] leading-[18px] font-medium text-sky-700'>Tags</div>
        {TAGS.map((tag) => (
          <div key={tag} className='text-[13px] leading-[18px] mt-2.5 pt-2.5 border-t text-sky-500 border-sky-100'>
            {tag}
          </div>
        ))}
      </div>
    </ScrollContainer>
  );
};

export default {
  component: ScrollContainer,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col w-full h-screen justify-center items-center bg-white'>
        <Story />
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <Test />
};
