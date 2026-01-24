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
  indent?: boolean;
  image?: string;
};

const DefaultStory = ({ title, description, indent, image }: CardStoryProps) => {
  return (
    <Card.Root role='card--intrinsic'>
      <Card.Toolbar>
        <Card.DragHandle />
        <Card.Title>{title}</Card.Title>
        <Card.Menu items={[]} />
      </Card.Toolbar>
      {image && <Card.Poster alt={title} image={image} />}
      {description && (
        <Card.Section indent={indent}>
          <Card.Text valence='description'>{description}</Card.Text>
        </Card.Section>
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
    indent: true,
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
          <Card.Menu items={[]} />
        </Card.Toolbar>
        <Card.Section icon='ph--circle--regular'>
          <Card.Text>Card.Text</Card.Text>
        </Card.Section>
        <Card.Poster alt='Card.Poster' image={image} />
        <Card.Section icon='ph--circle--regular'>
          <Card.Text valence='description'>Card.Description {description}</Card.Text>
        </Card.Section>
        <Card.Section icon='ph--circle--regular'>
          <Card.Text>Card.Text</Card.Text>
        </Card.Section>
        <Card.Action icon='ph--circle--regular' label='Card.Action' onClick={() => console.log('action')} />
        <Card.Link label='Card.Link' href='https://dxos.org' />
      </Card.Root>
    );
  },
};
