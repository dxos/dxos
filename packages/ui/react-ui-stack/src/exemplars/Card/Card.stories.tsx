//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';

import { Card } from './Card';

faker.seed(0);

type CardStoryProps = {
  title: string;
  description: string;
  image: string;
  showImage: boolean;
  showIcon: boolean;
};

const DefaultStory = ({ title, description, image, showImage, showIcon }: CardStoryProps) => {
  return (
    <div className='max-is-md'>
      <Card.StaticRoot>
        <Card.Toolbar>
          <Card.DragHandle toolbarItem />
          <Card.ToolbarSeparator variant='gap' />
          <Card.ToolbarIconButton iconOnly variant='ghost' icon='ph--x--regular' label={'remove card label'} />
        </Card.Toolbar>
        {showImage && <Card.Poster alt={title} image={image} />}
        {!showImage && showIcon && <Card.Poster alt={title} icon='ph--building-office--regular' />}
        <Card.Heading>{title}</Card.Heading>
        {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
      </Card.StaticRoot>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-stack/Card',
  render: DefaultStory,
    parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title',
    },
    description: {
      control: 'text',
      description: 'Card description',
    },
    image: {
      control: 'text',
      description: 'URL for the poster image',
    },
    showImage: {
      control: 'boolean',
      description: 'Whether to show the image',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show an icon (when image is not shown)',
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const image = faker.image.url();

export const Default: Story = {
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image,
    showImage: true,
    showIcon: true,
  },
};
