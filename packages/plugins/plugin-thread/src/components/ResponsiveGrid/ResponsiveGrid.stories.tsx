//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';

import { translations } from '../../translations';

import { ResponsiveGrid, type ResponsiveGridProps } from './ResponsiveGrid';
import { ResponsiveGridItem, type ResponsiveGridItemProps } from './ResponsiveGridItem';

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
      {item.type === 'image' && <img className='aspect-video object-contain' src={item.imageUrl} />}
      {item.type === 'video' && (
        <video
          className='w-full aspect-video object-cover rounded-md'
          src={item.videoUrl}
          playsInline
          autoPlay
          loop
          muted
        />
      )}
    </ResponsiveGridItem>
  );
};

type StoryProps = ResponsiveGridProps<TestItem> & { random?: boolean; autoHideGallery?: boolean };

const DefaultStory = (props: StoryProps) => {
  const [pinned, setPinned] = useState<string | undefined>(
    (props.pinned ?? props.items.length > 1) ? props.items[0]?.id : undefined,
  );
  const [items, setItems] = useState<TestItem[]>(props.items);
  useEffect(() => {
    if (!props.random) {
      return;
    }

    const interval = setInterval(() => {
      setItems((items) => {
        const p = Math.random();
        if (p < 0.5) {
          return items;
        } else if (p < 0.99 && items.length > 1) {
          return items.slice(0, -1);
        } else {
          return [...items, createItem(items[0]?.type)];
        }
      });
    }, 3_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='grid grow p-4'>
      <ResponsiveGrid {...props} Cell={TestCell} items={items} pinned={pinned} onPinnedChange={setPinned} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-thread/ResponsiveGrid',
  component: ResponsiveGrid as any,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

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

type Story = StoryObj<typeof meta>;

// TODO(burdon): Story to join/leave repeatedly to test stable position.

export const Default: Story = {
  args: {
    random: true,
    items: Array.from({ length: 8 }, (_, i) => createItem('video')),
  },
};

export const Fullscreen: Story = {
  args: {
    random: true,
    autoHideGallery: true,
    items: Array.from({ length: 8 }, (_, i) => createItem('video')),
  },
};

export const Images: Story = {
  args: {
    debug: true,
    items: Array.from({ length: 8 }, (_, i) => createItem('image')),
  },
};

export const Solo: Story = {
  args: {
    items: Array.from({ length: 1 }, (_, i) => createItem('image')),
  },
};

export const TwoUp: Story = {
  args: {
    items: Array.from({ length: 2 }, (_, i) => createItem('image')),
  },
};
