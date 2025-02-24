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
  imageUrl?: string;
  videoUrl?: string;
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
    <GridCell {...props} item={item} name={item?.name} mute={mute} speaking={speaking} wave={wave}>
      {item?.imageUrl && <img className='aspect-video object-contain' src={item?.imageUrl} />}
      {item?.videoUrl && (
        <video className='aspect-video object-cover' src={item?.videoUrl} autoPlay muted playsInline />
      )}
    </GridCell>
  );
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-calls/Grid',
  component: Grid,
  render: (args) => {
    const [expanded, setExpanded] = useState<string | undefined>(args.expanded);
    const filteredItems = args.items?.filter((item) => item !== expanded);
    return <Grid {...args} Cell={TestCell} items={filteredItems} expanded={expanded} onExpand={setExpanded} />;
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

const videoUrls = [
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

const items: TestItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: i.toString(),
  name: faker.person.fullName(),
  // imageUrl: `https://placehold.co/3200x1800?font=roboto&text=${i}`,
  videoUrl: videoUrls[i % videoUrls.length],
}));

export const Default: Story = {
  args: {
    items,
    expanded: items[0],
  },
};
