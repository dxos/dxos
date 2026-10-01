//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { random } from '@dxos/random';
import { Next } from '@dxos/react-ui/next';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

const DefaultStory = () => {
  const { title, image, paragraphs } = useMemo(
    () => ({
      title: random.lorem.sentence(4),
      image: random.image.url(),
      paragraphs: Array.from({ length: 10 }, () => random.lorem.paragraph(3)),
    }),
    [],
  );

  return (
    <Next.ScrollArea.Root>
      <Next.ScrollArea.Viewport classNames='flex flex-col gap-2 py-3'>
        <h1 className='text-2xl'>{title}</h1>
        <Next.Image src={image} alt={title} fit='cover' />
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-crx/stories/Testbench',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
