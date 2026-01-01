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
    <Card.StaticRoot classNames='is-cardMinWidth max-is-cardMinWidth'>
      <Card.Toolbar>
        <Card.DragHandle toolbarItem />
        <Card.ToolbarSeparator variant='gap' />
        <Card.ToolbarIconButton iconOnly variant='ghost' icon='ph--x--regular' label={'remove card label'} />
      </Card.Toolbar>
      {image && <Card.Poster alt={title} image={image} />}
      <Card.Heading>{title}</Card.Heading>
      {description && <Card.Text classNames='line-clamp-3'>{description}</Card.Text>}
    </Card.StaticRoot>
  );
};

const meta = {
  title: 'ui/react-ui-stack/Card',
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
    description: faker.lorem.paragraph(),
  },
};

export const WithImage: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image,
  },
};
