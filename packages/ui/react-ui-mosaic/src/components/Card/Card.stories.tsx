//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { Card } from './Card';

faker.seed(0);

type CardStoryProps = {
  title: string;
  description: string;
  image?: string;
};

const DefaultStory = ({ title, description, image }: CardStoryProps) => {
  const handleRef = useRef<HTMLButtonElement>(null);
  return (
    <Card.Root role='card--intrinsic'>
      <Card.Toolbar>
        <Card.DragHandle ref={handleRef} />
        <Card.Title>{title}</Card.Title>
        <Card.Close onClose={() => console.log('close')} />
      </Card.Toolbar>
      <Card.Poster alt='Card.Poster' image={image} />
      <Card.Row icon='ph--dot-outline--regular'>
        <Card.Heading>Card.Heading</Card.Heading>
      </Card.Row>
      <Card.Row icon='ph--dot-outline--regular'>
        <Card.Text>Card.Text (default)</Card.Text>
      </Card.Row>
      <Card.Row icon='ph--dot-outline--regular'>
        <Card.Text variant='description'>
          Card.Text (description)
          <br />
          {description}
        </Card.Text>
      </Card.Row>
      <Card.Row icon='ph--dot-outline--regular'>
        <Card.Heading variant='subtitle'>Card.Heading (subtitle)</Card.Heading>
      </Card.Row>
      <Card.Action label='Card.Action' onClick={() => console.log('action')} />
      <Card.Link label='Card.Link' href='https://dxos.org' />
    </Card.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Card',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const image = faker.image.url();

export const Default: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(3),
    image,
  },
};

export const Mock = () => (
  <div className='grid grid-cols-[2rem_1fr_2rem] is-cardMinWidth border border-separator rounded-sm'>
    <div className='grid grid-cols-subgrid col-span-full'>
      <div className='p-1'>A</div>
      <div className='p-1 truncate text-description'>This line is very very long and it should wrap.</div>
      <div className='p-1'>B</div>
    </div>
    <div className='grid grid-cols-subgrid col-span-3'>
      <div className='p-1'>A</div>
      <div className='p-1 truncate text-description col-span-2'>This line is very very long and it should wrap.</div>
    </div>
  </div>
);
