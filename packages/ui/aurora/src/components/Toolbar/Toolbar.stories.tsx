//
// Copyright 2023 DXOS.org
//

import { ArrowClockwise, Bug, FileJs, FileTs, TextB, TextItalic, TextUnderline } from '@phosphor-icons/react';
import React from 'react';

import '@dxosTheme';

import { Toolbar } from './Toolbar';
import { Toggle } from '../Buttons';
import { Select } from '../Select';

type StorybookToolbarProps = {};

const StorybookToolbar = (props: StorybookToolbarProps) => {
  return (
    <Toolbar.Root>
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
      <Toolbar.Separator />
      <Toolbar.Button>Test</Toolbar.Button>
      <Toolbar.Button>
        <ArrowClockwise />
      </Toolbar.Button>
    </Toolbar.Root>
  );
};

export default {
  component: StorybookToolbar,
};

export const Default = {
  args: {},
};
