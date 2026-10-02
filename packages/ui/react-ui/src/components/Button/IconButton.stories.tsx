//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, type ReactNode, useState } from 'react';

import { type Density } from '@dxos/ui-types';

import { translations } from '#translations';

import { withTheme } from '../../testing/index.ts';
import * as Tooltip from '../Tooltip/Tooltip.tsx';
import * as Button from './Button.tsx';
import * as IconButton from './IconButton.tsx';
import * as SystemIconButton from './SystemIconButton.tsx';

const DefaultStory = (props: IconButton.RootProps) => {
  return (
    <Tooltip.Provider>
      <div className='flex gap-4'>
        <IconButton.Root {...props} />
        <IconButton.Root iconOnly {...props} />
        <Button.Root>{props.label}</Button.Root>
      </div>
    </Tooltip.Provider>
  );
};

const densities: Density[] = ['lg', 'md', 'sm'];
const densityIconSize: Record<Density, IconButton.RootProps['size']> = {
  lg: 5,
  md: 4,
  sm: 4,
};

const DensitiesStory = (props: Omit<IconButton.RootProps, 'density' | 'size'>) => {
  return (
    <Tooltip.Provider>
      <div className='grid grid-cols-[auto_1fr_1fr] gap-4 items-center'>
        <div />
        <div className='text-xs text-subdued uppercase'>iconOnly</div>
        <div className='text-xs text-subdued uppercase'>label + icon</div>
        <div className='text-xs text-subdued uppercase'>Button (reference)</div>
        {densities.map((density) => (
          <Fragment key={density}>
            <div className='text-xs font-mono'>density={density}</div>
            <IconButton.Root
              square
              classNames='w-fit'
              density={density}
              size={densityIconSize[density]}
              iconOnly
              {...props}
            />
            <IconButton.Root classNames='w-fit' density={density} size={densityIconSize[density]} {...props} />
            <Button.Root density={density}>{props.label}</Button.Root>
          </Fragment>
        ))}
      </div>
    </Tooltip.Provider>
  );
};

type SystemPresetVariantProps = Partial<Pick<IconButton.RootProps, 'variant' | 'iconOnly'>>;

const SystemPresetRow = ({
  name,
  button,
}: {
  name: string;
  button: (props: SystemPresetVariantProps) => ReactNode;
}) => (
  <div className='grid grid-cols-subgrid col-span-full gap-x-8 items-center'>
    <div className='text-xs font-mono'>{name}</div>
    <div>{button({})}</div>
    <div>{button({ variant: 'ghost' })}</div>
    <div>{button({ variant: 'ghost', iconOnly: true })}</div>
  </div>
);

const SystemStory = () => {
  const [state, setState] = useState<Record<string, boolean>>({});

  return (
    <Tooltip.Provider>
      <div className='grid grid-cols-[auto_1fr_1fr_auto] gap-y-3 items-center'>
        <div className='grid grid-cols-subgrid col-span-full gap-x-8'>
          <div />
          <div className='text-xs text-subdued uppercase'>default</div>
          <div className='text-xs text-subdued uppercase'>ghost</div>
          <div className='text-xs text-subdued uppercase'>iconOnly</div>
        </div>

        <SystemPresetRow
          name='Star'
          button={(props) => (
            <SystemIconButton.Star
              active={state.star}
              onClick={() => setState((prev) => ({ ...prev, star: !prev.star }))}
              {...props}
            />
          )}
        />
        <SystemPresetRow
          name='Bookmark'
          button={(props) => (
            <SystemIconButton.Bookmark
              active={state.bookmark}
              onClick={() => setState((prev) => ({ ...prev, bookmark: !prev.bookmark }))}
              {...props}
            />
          )}
        />
        <SystemPresetRow
          name='Disclosure'
          button={(props) => (
            <SystemIconButton.Disclosure
              active={state.disclosure}
              onClick={() => setState((prev) => ({ ...prev, disclosure: !prev.disclosure }))}
              {...props}
            />
          )}
        />
        <br />
        <SystemPresetRow name='Add' button={(props) => <SystemIconButton.Add {...props} />} />
        <SystemPresetRow name='Delete' button={(props) => <SystemIconButton.Delete {...props} />} />
        <SystemPresetRow name='Edit' button={(props) => <SystemIconButton.Edit {...props} />} />
        <SystemPresetRow name='Close' button={(props) => <SystemIconButton.Close {...props} />} />
      </div>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/IconButton',
  component: IconButton.Root,
  render: DefaultStory as any,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof IconButton.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DensitiesStory as any,
  args: {
    label: 'Close',
    icon: 'ph--x--regular',
  },
};

export const Ghost: Story = {
  render: DensitiesStory as any,
  args: {
    label: 'Close',
    icon: 'ph--x--regular',
    variant: 'ghost',
  },
};

export const System: Story = {
  render: SystemStory,
  args: {
    label: 'System',
  },
};

const hues = ['neutral', 'red', 'amber', 'green', 'blue', 'purple', 'info', 'success', 'warning', 'error'] as const;

const TagStory = () => (
  <Tooltip.Provider>
    <div className='flex flex-wrap gap-2 items-center'>
      {hues.map((hue) => (
        <IconButton.Root key={hue} variant='tag' hue={hue} density='sm' icon='ph--copy--regular' iconEnd label={hue} />
      ))}
      <IconButton.Root variant='tag' density='sm' iconOnly icon='ph--x--regular' label='Remove' />
    </div>
  </Tooltip.Provider>
);

/** The `tag` variant: a clickable `dx-tag`, coloured by `hue`. */
export const Tag: Story = {
  render: TagStory,
  args: {
    label: 'Tag',
  },
};
