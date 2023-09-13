//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { FileTs, FileJs, ArrowClockwise, Bug, TextUnderline, TextB, TextItalic } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { createScenarios } from './helpers';
import { Input, Select, Toggle, Toolbar } from '../components';

const Story = () => {
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
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {/* TODO(burdon): Highlight is cyan. */}
        {/* TODO(burdon): Show vertical divider by default. */}
        {/* TODO(burdon): Icon sizes should adapt to density. */}
        <Toolbar.ToggleGroup type='multiple'>
          <Toolbar.ToggleGroupItem value='a'>
            <TextB />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='b'>
            <TextItalic />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='c'>
            <TextUnderline />
          </Toolbar.ToggleGroupItem>
        </Toolbar.ToggleGroup>
        {/* TODO(burdon): Highlight isn't shown. */}
        <Toolbar.ToggleGroup type='single' defaultValue='a'>
          <Toolbar.ToggleGroupItem value='a'>
            <FileTs />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='b'>
            <FileJs />
          </Toolbar.ToggleGroupItem>
        </Toolbar.ToggleGroup>
        <Toolbar.Button asChild>
          <Toggle>
            <Bug />
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
          <ArrowClockwise />
        </Toolbar.Button>
      </Toolbar.Root>
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
