//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing/index.ts';
import * as Toggle from '../Button/Toggle.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as Select from '../Select/Select.tsx';
import * as Toolbar from './Toolbar.tsx';

type StorybookToolbarProps = Pick<Toolbar.RootProps, 'elevation'>;

const DefaultStory = ({ elevation }: StorybookToolbarProps) => {
  return (
    <Toolbar.Root elevation={elevation}>
      {/* TODO(burdon): Should be fixed width (regardless of selection). */}
      <Select.Root>
        <Toolbar.Button asChild>
          <Select.TriggerButton placeholder={'Select value'} />
        </Toolbar.Button>
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              <Select.Option value={'a'}>A</Select.Option>
              <Select.Option value={'b'}>B</Select.Option>
              <Select.Option value={'c'}>C</Select.Option>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {/* TODO(burdon): Highlight is cyan. */}
      {/* TODO(burdon): Show vertical divider by default. */}
      {/* TODO(burdon): Icon sizes should adapt to density. */}
      <Toolbar.ToggleGroup type='multiple'>
        <Toolbar.ToggleGroupItem value='a'>
          <Icon.Root icon='ph--text-b--regular' />
        </Toolbar.ToggleGroupItem>
        <Toolbar.ToggleGroupItem value='b'>
          <Icon.Root icon='ph--text-italic--regular' />
        </Toolbar.ToggleGroupItem>
        <Toolbar.ToggleGroupItem value='c'>
          <Icon.Root icon='ph--text-underline--regular' />
        </Toolbar.ToggleGroupItem>
      </Toolbar.ToggleGroup>
      {/* TODO(burdon): Highlight isn't shown. */}
      <Toolbar.ToggleGroup type='single' defaultValue='a'>
        <Toolbar.ToggleGroupItem value='a'>
          <Icon.Root icon='ph--file-ts--regular' />
        </Toolbar.ToggleGroupItem>
        <Toolbar.ToggleGroupItem value='b'>
          <Icon.Root icon='ph--file-js--regular' />
        </Toolbar.ToggleGroupItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Button asChild>
        <Toggle.Root>
          <Icon.Root icon='ph--bug--regular' />
        </Toggle.Root>
      </Toolbar.Button>
      <Toolbar.Separator />
      <Toolbar.Button>Test</Toolbar.Button>
      <Toolbar.IconButton icon='ph--arrow-clockwise--regular' label='Refresh' iconOnly />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toolbar',
  component: Toolbar as any,
  render: DefaultStory,
  decorators: [withTheme()],
  argTypes: {
    elevation: { control: 'select', options: [undefined, 0, 1, 2, 3, 4, 5] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
