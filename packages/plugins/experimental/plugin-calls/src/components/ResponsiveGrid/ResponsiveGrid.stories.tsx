//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ResponsiveGrid, type ResponsiveGridProps } from './ResponsiveGrid';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from './ResponsiveGridItem';

type TestItem = {
  id: string;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
};

const TestCell = ({ item, ...props }: ResponsiveGridItemProps<TestItem>) => {
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
    <ResponsiveGridItem {...props} item={item} name={item?.name} mute={mute} speaking={speaking} wave={wave}>
      {item?.imageUrl && <img className='flex aspect-video object-contain' src={item?.imageUrl} />}
      {item?.videoUrl && (
        <video className='flex aspect-video object-cover' src={item?.videoUrl} playsInline autoPlay loop muted />
      )}
    </ResponsiveGridItem>
  );
};

const meta: Meta<ResponsiveGridProps<TestItem>> = {
  title: 'plugins/plugin-calls/ResponsiveGridProps',
  component: ResponsiveGrid,
  render: (args) => {
    const [pinned, setPinned] = useState<string | undefined>(args.pinned);
    return <ResponsiveGrid {...args} Cell={TestCell} items={args.items} pinned={pinned} onPinnedChange={setPinned} />;
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

type Story = StoryObj<ResponsiveGridProps<TestItem>>;

export const Default: Story = {
  args: {
    items,
    pinned: items[0].id,
  },
};
