//
// Copyright 2023 DXOS.org
//

import * as ScrollArea from '@radix-ui/react-scroll-area';
import React from 'react';

const TAGS = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

// border, bg, text

//
// blackA6
// blackA7
// blackA8
// violet11
// mauve6
// mauve10
// mauve12
//

// TODO(burdon): See dark mode in composer. index.html setTheme.
// text (body, description)
// icon
// selected, hover
// panels, borders

const ScrollContainer = () => null;

const Test = () => {
  return (
    <ScrollArea.Root className='w-[200px] h-[225px] rounded overflow-hidden shadow-[0_2px_10px] shadow-blackA7 bg-white'>
      <ScrollArea.Viewport className='w-full h-full rounded'>
        <div className='py-[15px] px-5'>
          <div className='text-violet11 text-[15px] leading-[18px] font-medium'>Tags</div>
          {TAGS.map((tag) => (
            <div className='text-mauve12 text-[13px] leading-[18px] mt-2.5 pt-2.5 border-t border-t-mauve6' key={tag}>
              {tag}
            </div>
          ))}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className='flex select-none touch-none p-0.5 bg-blackA6 transition-colors duration-[160ms] ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5'
        orientation='vertical'
      >
        <ScrollArea.Thumb className="flex-1 bg-mauve10 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar
        className='flex select-none touch-none p-0.5 bg-blackA6 transition-colors duration-[160ms] ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5'
        orientation='horizontal'
      >
        <ScrollArea.Thumb className="flex-1 bg-mauve10 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner className='bg-blackA8' />
    </ScrollArea.Root>
  );
};

export default {
  component: ScrollContainer,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col w-full h-screen items-center bg-white'>
        <div className='w-[500px]'>
          <Story />
        </div>
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
