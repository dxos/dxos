//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing';

import { Scrollable, type ScrollableProps } from './Scrollable';

const DefaultStory = (props: ScrollableProps) => {
  return (
    <Scrollable {...props} classNames='bs-full is-full'>
      <div className={mx('bg-cubes', props.orientation === 'vertical' ? 'bs-[200rem]' : 'bs-full is-[200rem]')} />
    </Scrollable>
  );
};

const meta: Meta<typeof Scrollable> = {
  title: 'ui/react-ui-core/primitives/Scrollable',
  component: Scrollable,
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

export const VerticalPadding: Story = {
  args: {
    orientation: 'vertical',
    padding: true,
  },
};

export const HorizontalPadding: Story = {
  args: {
    orientation: 'horizontal',
    padding: true,
  },
};

const Column = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div
      className={mx(
        'shrink-0 flex flex-col border border-separator is-screen md:is-card-default-width md:rounded',
        classNames,
      )}
    >
      <div className='p-2'>{children}</div>
    </div>
  );
};

/**
 * Snap center of column.
 */
export const Snap = {
  render: () => (
    <Scrollable classNames='md:p-2' orientation='horizontal' snap padding>
      <div className='flex bs-full gap-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <Column key={i} classNames='snap-center md:snap-align-none'>
            Column {i + 1}
          </Column>
        ))}
      </div>
    </Scrollable>
  ),
};
