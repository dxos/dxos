//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

const MIN_HEIGHT = 200;
const MIN_WIDTH = 200;

const Video = ({
  classNames,
  label,
  onExpand,
  onClose,
}: ThemedClassName<{ label: string; onExpand?: () => void; onClose?: () => void }>) => {
  return (
    <div className={mx('flex grow overflow-hidden justify-center items-center', classNames)}>
      <div className='relative max-w-full max-h-full aspect-video'>
        <img src='https://placehold.co/1600x900?text=16x9&font=roboto' className='object-contain aspect-video' />
        <div className='z-10 absolute left-2 top-2 text-black'>{label}</div>
        {onExpand && (
          <div className='z-10 absolute right-2 top-2'>
            <Icon
              icon='ph--arrows-out--regular'
              size={6}
              classNames='text-black cursor-pointer'
              onClick={() => onExpand()}
            />
          </div>
        )}
        {onClose && (
          <div className='z-10 absolute right-2 top-2'>
            <Icon icon='ph--x--regular' size={6} classNames='text-black cursor-pointer' onClick={() => onClose()} />
          </div>
        )}
      </div>
    </div>
  );
};

type GridProps = {
  items?: string[];
  expanded?: string;
  onExpand?: (item?: string) => void;
};

const Grid = ({ items, expanded, onExpand }: GridProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const singleRow = width >= height;

  return (
    <div ref={ref} className={mx('flex flex-col gap-2 w-full h-full overflow-hidden')}>
      {expanded && (
        <div className={mx('flex grow aspect-video', singleRow && 'overflow-hidden')}>
          <Video label={expanded} onClose={() => onExpand?.()} classNames='bg-red-500' />
        </div>
      )}

      {(singleRow && (
        <div className='flex shrink-0 overflow-hidden' style={{ minHeight: MIN_HEIGHT }}>
          <GridRow items={items} expanded={expanded} onExpand={onExpand} />
        </div>
      )) || (
        <div className='flex grow overflow-hidden'>
          <GridColumn items={items} expanded={expanded} onExpand={onExpand} />
        </div>
      )}
    </div>
  );
};

const GridRow = ({ items, expanded, onExpand }: GridProps) => {
  return (
    <div className='flex gap-2 overflow-x-auto'>
      {items
        ?.filter((item) => item !== expanded)
        .map((item, i) => (
          <div key={i} className='aspect-video'>
            <Video label={item} onExpand={() => onExpand?.(item)} />
          </div>
        ))}
    </div>
  );
};

const GridColumn = ({ items, expanded, onExpand }: GridProps) => {
  const { ref, width, height = 0 } = useResizeDetector();

  const cellsPerColumn = Math.floor(height / MIN_HEIGHT);
  const maxCols = Math.ceil(items?.length ?? 0 / cellsPerColumn);
  let cols = maxCols;
  for (; cols > 0; cols--) {
    const cellWidth = (width ?? 0) / cols;
    console.log(cellWidth, MIN_WIDTH);
    if (cellWidth >= MIN_WIDTH) {
      break;
    }
  }

  const classNames = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'];
  return (
    <div ref={ref} className='flex flex-col overflow-y-auto justify-center items-center'>
      <div className=''>
        <div className={mx('grid gap-2', classNames[Math.min(classNames.length, cols) - 1])}>
          {height &&
            items
              ?.filter((item) => item !== expanded)
              .map((item, i) => (
                <div key={i} className='aspect-video'>
                  <Video label={item} onExpand={() => onExpand?.(item)} />
                </div>
              ))}
        </div>
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
    items: Array.from({ length: 7 }, (_, i) => i.toString()),
    expanded: '1',
  },
};
