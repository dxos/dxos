//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { X } from '@phosphor-icons/react';
import React from 'react';

import { getSize } from '@dxos/aurora-theme';

import { Button, DensityProvider, Input, Select } from '../components';
import { createDensityTest } from './helpers';

export default {
  component: DensityProvider,
};

// TODO(burdon): Button icons too large by default?
// TODO(burdon): Should text have isfull by default?
// TODO(burdon): Checkbox.
// TODO(burdon): Button group.
// TODO(burdon): Toolbar (vertical align).
const ScenarioContent = () => (
  <div className='flex'>
    <Button>Text</Button>
    <Button>
      <X className={getSize(6)} />
    </Button>
    <Input.Root>
      <Input.TextInput />
    </Input.Root>
    <Input.Root>
      <Input.Checkbox checked={true} />
      <Input.Label>Checkbox</Input.Label>
    </Input.Root>
    <Select.Root>
      <Select.Trigger placeholder={'Select value'} />
      <Select.Content>
        <Select.Item value={'a'}>A</Select.Item>
        <Select.Item value={'b'}>B</Select.Item>
        <Select.Item value={'c'}>C</Select.Item>
      </Select.Content>
    </Select.Root>
  </div>
);

export const Default = {
  args: {},
  render: createDensityTest(ScenarioContent),
};
