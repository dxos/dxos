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
import React, { useState } from 'react';

import { Button, Input, Select, Toggle, ToggleGroup, ToggleGroupItem, Toolbar } from '../components';
import { createScenarios } from './helpers';

const Story = () => {
  const [checked, setChecked] = useState<boolean>(false);
  const [select, setSelect] = useState<string>();

  return (
    <div className='flex flex-col gap-2'>
      <Toolbar classNames='flex'>
        {/* TODO(burdon): Should be fixed width (regardless of selection). */}
        <Select.Root value={select} onValueChange={setSelect}>
          <Select.TriggerButton placeholder={'Select value'} />
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
          <Input.Checkbox checked={checked} onCheckedChange={(value) => setChecked(!!value)} />
          <Input.Label>Checkbox</Input.Label>
        </Input.Root>
        <Button>Test</Button>
        <Button>
          <ArrowClockwise />
        </Button>
      </Toolbar>
      <Input.Root>
        <Input.TextArea placeholder='Enter text...' rows={3} classNames='resize-none' />
      </Input.Root>
    </div>
  );
};

export default {
  component: Story,
};

export const Default = {
  render: createScenarios(Story),
};
