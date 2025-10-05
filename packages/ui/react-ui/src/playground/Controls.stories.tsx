//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Icon, Input, Select, Toggle, Toolbar } from '../components';
import { withSurfaceVariantsLayout } from '../testing';

const DefaultStory = () => {
  const [checked, setChecked] = useState<boolean>(false);
  const [select, setSelect] = useState<string>();

  return (
    <div className='flex flex-col gap-2'>
      <Toolbar.Root>
        {/* TODO(burdon): Should be fixed width (regardless of selection). */}
        <Select.Root value={select} onValueChange={setSelect}>
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
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {/* TODO(burdon): Highlight is cyan. */}
        {/* TODO(burdon): Show vertical divider by default. */}
        {/* TODO(burdon): Icon sizes should adapt to density. */}
        <Toolbar.ToggleGroup type='multiple'>
          <Toolbar.ToggleGroupItem value='a'>
            <Icon icon='ph--text-b--regular' />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='b'>
            <Icon icon='ph--text-italic--regular' />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='c'>
            <Icon icon='ph--text-underline--regular' />
          </Toolbar.ToggleGroupItem>
        </Toolbar.ToggleGroup>
        {/* TODO(burdon): Highlight isn't shown. */}
        <Toolbar.ToggleGroup type='single' defaultValue='a'>
          <Toolbar.ToggleGroupItem value='a'>
            <Icon icon='ph--file-ts--regular' />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='b'>
            <Icon icon='ph--file-js--regular' />
          </Toolbar.ToggleGroupItem>
        </Toolbar.ToggleGroup>
        <Toolbar.Button asChild>
          <Toggle>
            <Icon icon='ph--bug--regular' />
          </Toggle>
        </Toolbar.Button>
        {/* TODO(burdon): Should not be 'is-full' by default. */}
        <Input.Root>
          <Input.TextInput placeholder='Enter text...' />
        </Input.Root>
        {/* TODO(burdon): Checkbox collapsed. */}
        <Input.Root>
          <Input.Checkbox checked={checked} onCheckedChange={(value) => setChecked(!!value)} />
          <Input.Label>Checkbox</Input.Label>
        </Input.Root>
        <Toolbar.Button>Test</Toolbar.Button>
        <Toolbar.Button>
          <Icon icon='ph--arrow-clockwise--regular' />
        </Toolbar.Button>
      </Toolbar.Root>
      <Input.Root>
        <Input.TextArea placeholder='Enter text...' rows={3} classNames='resize-none' />
      </Input.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/Playground/Controls',
  render: DefaultStory,
  decorators: [withTheme, withSurfaceVariantsLayout()],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
