//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Grid, GridCell, type GridProps, type GridCellProps } from './Grid';

type TestItem = {
  id: string;
  name: string;
};

const TestCell = ({ item, ...props }: GridCellProps<TestItem>) => {
  const [speaking, setSpeaking] = useState(false);
  const [wave, setWave] = useState(false);
  const [mute, setMute] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const mute = Math.random() > 0.7;
      setMute(() => mute);
      setSpeaking(() => !mute && Math.random() > 0.5);
      setWave(() => Math.random() > 0.7);
    }, 3_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GridCell {...props} item={item} label={item?.name} mute={mute} speaking={speaking} wave={wave}>
      <img src={`https://placehold.co/1600x900?font=roboto&text=${item?.id}`} className='object-contain aspect-video' />
    </GridCell>
  );
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-calls/Grid',
  component: Grid,
  render: (args) => {
    const [expanded, setExpanded] = useState<string | undefined>(args.expanded);
    return <Grid {...args} Cell={TestCell} expanded={expanded} onExpand={setExpanded} />;
  },
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<GridProps>;

const items = Array.from({ length: 7 }, (_, i) => ({ id: i.toString(), name: faker.person.fullName() }));

export const Default: Story = {
  args: {
    items,
    expanded: items[0],
  },
};
