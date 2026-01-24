//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

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
  return (
    <Card.Root role='card--intrinsic'>
      <Card.Toolbar>
        <Card.DragHandle />
        <Card.Title>{title}</Card.Title>
        <Card.Menu items={[]} />
      </Card.Toolbar>
      {image && <Card.Poster alt={title} image={image} />}
      {description && (
        <Card.Row>
          <Card.Text variant='description'>{description}</Card.Text>
        </Card.Row>
      )}
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
  },
};

export const WithImage: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(3),
    image,
  },
};

export const Everything: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(3),
    image,
  },
  render: ({ title, description, image }) => {
    return (
      <Card.Root role='card--intrinsic'>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Title>{title}</Card.Title>
          <Card.Close onClose={() => console.log('close')} />
        </Card.Toolbar>
        <Card.Poster alt='Card.Poster' image={image} />
        <Card.Heading>Card.Heading</Card.Heading>
        <Card.Text>Card.Text</Card.Text>
        <Card.Text variant='description'>Card.Description {description}</Card.Text>
        <Card.Action label='Card.Action' onClick={() => console.log('action')} />
        <Card.Link label='Card.Link' href='https://dxos.org' />
      </Card.Root>
    );
  },
};
