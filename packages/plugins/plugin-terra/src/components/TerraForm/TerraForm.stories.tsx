//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { withTheme } from '@dxos/react-ui/testing';

import * as Terra from '../../types/Terra';
import { TerraForm } from './TerraForm';

const DefaultStory = () => {
  const terra = useMemo(() => Terra.make({ config: { seed: 'terra-1', resolution: 128 } }), []);
  const [config, updateConfig] = useObject(terra, 'config');
  const [waterSheen, setWaterSheen] = useState(false);

  return (
    <div className='flex flex-col gap-2 p-4'>
      <TerraForm
        config={config}
        onChange={(patch) => updateConfig((draft) => Object.assign(draft, patch))}
        onWaterSheen={setWaterSheen}
      />
      <div className='text-sm text-description'>water sheen: {String(waterSheen)}</div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-terra/components/TerraForm',
  component: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
