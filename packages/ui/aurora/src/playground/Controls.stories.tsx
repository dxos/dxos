//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import {
  FileTs,
  FileJs,
  ArrowClockwise,
  Bug,
  TextAlignLeft,
  TextAlignRight,
  TextAlignCenter,
} from '@phosphor-icons/react';
import React from 'react';

import { Button, Input, Select, Toggle, ToggleGroup, ToggleGroupItem, Toolbar } from '../components';
import { createScenarios } from './helpers';

const Story = () => (
  <div className='flex flex-col space-y-2'>
    <Toolbar classNames='flex'>
      <Button>Test</Button>
      <Button>
        <ArrowClockwise />
      </Button>
      {/* TODO(burdon): Highlight is cyan. */}
      {/* TODO(burdon): Show vertical divider by default. */}
      {/* TODO(burdon): Icon sizes should adapt to density. */}
      <ToggleGroup type='multiple'>
        <ToggleGroupItem value='a'>
          <TextAlignLeft />
        </ToggleGroupItem>
        <ToggleGroupItem value='b'>
          <TextAlignCenter />
        </ToggleGroupItem>
        <ToggleGroupItem value='c'>
          <TextAlignRight />
        </ToggleGroupItem>
      </ToggleGroup>
      {/* TODO(burdon): Highlight isn't shown. */}
      <ToggleGroup type='single' value='a'>
        <ToggleGroupItem value='a'>
          <FileTs />
        </ToggleGroupItem>
        <ToggleGroupItem value='b'>
          <FileJs />
        </ToggleGroupItem>
      </ToggleGroup>
      <Toggle>
        <Bug />
      </Toggle>
      {/* TODO(burdon): Should not be 'is-full' by default. */}
      <Input.Root>
        <Input.TextInput placeholder='Enter text...' />
      </Input.Root>
      {/* TODO(burdon): Checkbox collapsed. */}
      <Input.Root>
        <Input.Checkbox checked={true} />
        <Input.Label>Checkbox</Input.Label>
      </Input.Root>
      {/* TODO(burdon): Should be fixed width (regardless of selection). */}
      <Select.Root>
        <Select.Trigger placeholder={'Select value'} />
        <Select.Content>
          <Select.Item value={'a'}>A</Select.Item>
          <Select.Item value={'b'}>B</Select.Item>
          <Select.Item value={'c'}>C</Select.Item>
        </Select.Content>
      </Select.Root>
    </Toolbar>
    <div>
      <Input.Root>
        <Input.TextArea placeholder='Enter text...' rows={3} classNames='resize-none' />
      </Input.Root>
    </div>
  </div>
);

export default {
  component: Story,
};

export const Default = {
  render: createScenarios(Story),
};
