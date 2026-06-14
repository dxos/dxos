//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';

import { type Density } from '@dxos/ui-types';

import { withTheme } from '../../testing';
import { translations } from '../../translations';
import { Tooltip } from '../Tooltip';
import { Button } from './Button';
import { IconButton, type IconButtonProps } from './IconButton';
import { SystemIconButton } from './SystemIconButton';

const DefaultStory = (props: IconButtonProps) => {
  return (
    <Tooltip.Provider>
      <div className='flex gap-4'>
        <IconButton {...props} />
        <IconButton iconOnly {...props} />
        <Button>{props.label}</Button>
      </div>
    </Tooltip.Provider>
  );
};

const densities: Density[] = ['lg', 'md', 'sm', 'xs'];
const densityIconSize: Record<Density, IconButtonProps['size']> = {
  lg: 5,
  md: 4,
  sm: 4,
  xs: 4,
};

const DensitiesStory = (props: Omit<IconButtonProps, 'density' | 'size'>) => {
  return (
    <Tooltip.Provider>
      <div className='grid grid-cols-[auto_1fr_1fr_1fr] gap-4 items-center'>
        <div />
        <div className='text-xs text-subdued uppercase'>iconOnly</div>
        <div className='text-xs text-subdued uppercase'>label + icon</div>
        <div className='text-xs text-subdued uppercase'>Button (reference)</div>
        {densities.map((density) => (
          <React.Fragment key={density}>
            <div className='text-xs font-mono'>density={density}</div>
            <IconButton
              square
              classNames='w-fit'
              density={density}
              size={densityIconSize[density]}
              iconOnly
              {...props}
            />
            <IconButton classNames='w-fit' density={density} size={densityIconSize[density]} {...props} />
            <Button density={density}>{props.label}</Button>
          </React.Fragment>
        ))}
      </div>
    </Tooltip.Provider>
  );
};

type SystemPresetVariantProps = Partial<Pick<IconButtonProps, 'variant' | 'iconOnly'>>;

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
          name='Expander'
          button={(props) => (
            <SystemIconButton.Expander
              active={state.expander}
              onClick={() => setState((prev) => ({ ...prev, expander: !prev.expander }))}
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
  component: IconButton,
  render: DefaultStory as any,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof IconButton>;

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
