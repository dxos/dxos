//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withLayout, withTheme() } from '@dxos/react-ui/testing';

import { Card } from './Card';

faker.seed(0);

type CardStoryProps = {
  title: string;
  description?: string;
  image?: string;
  fullWidth?: boolean;
};

const DefaultStory = ({ title, description, image, fullWidth }: CardStoryProps) => {
  const handleRef = useRef<HTMLButtonElement>(null);
  return (
    <Card.Root fullWidth={fullWidth}>
      <Card.Toolbar>
        <Card.DragHandle ref={handleRef} />
        <Card.Title>{title}</Card.Title>
        <Card.Close onClick={() => console.log('close')} />
      </Card.Toolbar>
      <Card.Content>
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
      </Card.Content>
    </Card.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Card',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'grid is-[30rem] place-items-center' })],
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

export const FullWidth: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(3),
    image,
    fullWidth: true,
  },
};

export const Simple: Story = {
  args: {
    title: faker.commerce.productName(),
  },
  render: ({ title }) => {
    const handleRef = useRef<HTMLButtonElement>(null);
    return (
      <Card.Root>
        <Card.Toolbar>
          <Card.DragHandle ref={handleRef} />
          <Card.Title>{title}</Card.Title>
          <Card.Close onClick={() => console.log('close')} />
        </Card.Toolbar>
      </Card.Root>
    );
  },
};

export const Description: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(3),
  },
  render: ({ title, description }) => {
    const handleRef = useRef<HTMLButtonElement>(null);
    return (
      <Card.Root>
        <Card.Toolbar>
          <Card.DragHandle ref={handleRef} />
          <Card.Title>{title}</Card.Title>
          <Card.Close onClick={() => console.log('close')} />
        </Card.Toolbar>
        <Card.Content>
          <Card.Row>
            <Card.Text variant='description'>{description}</Card.Text>
          </Card.Row>
        </Card.Content>
      </Card.Root>
    );
  },
};

export const Mock = () => (
  <div className='grid grid-cols-[2rem_1fr_2rem] is-full card-min-width card-max-width border border-separator rounded-sm'>
    <div className='grid grid-cols-subgrid col-span-full'>
      <div role='none' className='grid bs-[var(--rail-item)] is-[var(--rail-item)] place-items-center'>
        <Icon icon='ph--dots-six-vertical--regular' />
      </div>
      <div className='p-1 truncate text-description items-center'>This line is very very long and it should wrap.</div>
      <div role='none' className='grid bs-[var(--rail-item)] is-[var(--rail-item)] place-items-center'>
        <Icon icon='ph--x--regular' />
      </div>
    </div>
    <div className='grid grid-cols-subgrid col-span-3'>
      <div role='none' className='grid bs-[var(--rail-item)] is-[var(--rail-item)] place-items-center'>
        <Icon icon='ph--dots-six-vertical--regular' />
      </div>
      <div className='p-1 text-description items-center col-span-2'>
        This line is very very long and it should wrap.
      </div>
    </div>
  </div>
);
