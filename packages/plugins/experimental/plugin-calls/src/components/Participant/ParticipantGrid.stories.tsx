//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Icon } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

const MIN_WIDTH = 300;

type GridProps = {
  items?: string[];
  expanded?: string;
  onExpand?: (item: string) => void;
};

const Grid = ({ items, expanded, onExpand }: GridProps) => {
  const { ref, width, height } = useResizeDetector();

  // TOOD(burdon): Horizontal grid vs. vertical column.

  return (
    <div ref={ref} className='flex flex-col w-full h-full overflow-hidden border-2 border-red-500'>
      {expanded && <div className='w-full aspect-video border-2 border-blue-500'>{expanded}</div>}
      <div className='flex grow gap-2 items-center border-2 border-green-500 overflow-x-auto'>
        {items
          ?.filter((item) => item !== expanded)
          .map((item, i) => (
            <div key={i}>
              <div className='relative min-w-96 aspect-video border-2 border-yellow-500'>
                <div className='absolute left-2 top-2'>{item}</div>
                <div className='absolute left-2 bottom-2'>
                  <Icon icon='ph--arrows-out--regular cursor-pointer' size={5} onClick={() => onExpand?.(item)} />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-calls/Grid',
  component: Grid,
  render: (args) => {
    const [expanded, setExpanded] = useState<string | undefined>(args.expanded);
    return (
      <div className='w-full outline outline-red-500'>
        <Grid {...args} expanded={expanded} onExpand={setExpanded} />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {
    items: ['1', '2', '3', '4', '5'],
    expanded: '1',
  },
};
