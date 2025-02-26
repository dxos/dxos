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
import translations from '../../translations';

type TestItem = {
  id: string;
  name: string;
  type?: 'image' | 'video';
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
    <ResponsiveGridItem {...props} item={item} name={item.name} mute={mute} speaking={speaking} wave={wave}>
      {item.type === 'image' && <img className='flex aspect-video object-contain' src={item.imageUrl} />}
      {item.type === 'video' && (
        <video className='flex aspect-video object-cover' src={item.videoUrl} playsInline autoPlay loop muted />
      )}
    </ResponsiveGridItem>
  );
};

const meta: Meta<ResponsiveGridProps<TestItem>> = {
  title: 'plugins/plugin-calls/ResponsiveGridProps',
  component: ResponsiveGrid,
  render: (args) => {
    const [pinned, setPinned] = useState<string | undefined>(args.pinned);
    const [items, setItems] = useState<TestItem[]>(args.items);

    useEffect(() => {
      const interval = setInterval(() => {
        setItems((items) => {
          if (items.length >= 20) {
            return items;
          }

          return [...items, createItem(items[0]?.type)];
        });
      }, 3_000);

      return () => clearInterval(interval);
    }, []);

    return <ResponsiveGrid {...args} Cell={TestCell} items={items} pinned={pinned} onPinnedChange={setPinned} />;
  },
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
  parameters: {
    translations,
  },
};

const videoUrls = [
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

const createItem = (type?: 'image' | 'video') => {
  const id = faker.string.uuid();
  return {
    id,
    type,
    name: faker.person.fullName(),
    imageUrl: `https://placehold.co/3200x1800/333/999?font=roboto&text=${id.slice(0, 2)}`,
    videoUrl: faker.helpers.arrayElement(videoUrls),
  };
};

export default meta;

type Story = StoryObj<ResponsiveGridProps<TestItem>>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 8 }, (_, i) => createItem('video')),
  },
};

export const Images: Story = {
  args: {
    items: Array.from({ length: 8 }, (_, i) => createItem('image')),
  },
};
