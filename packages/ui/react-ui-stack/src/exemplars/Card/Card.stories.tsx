//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Card } from './Card';

// Set a seed for reproducible random values
faker.seed(0);

type CardStoryProps = {
  title: string;
  description: string;
  image: string;
  showImage: boolean;
  showIcon: boolean;
};

const meta: Meta<CardStoryProps> = {
  title: 'ui/react-ui-stack/Card',
  decorators: [withTheme],
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
  args: {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image: faker.image.url(),
    showImage: true,
    showIcon: true,
  },
};

export default meta;

export const Default: StoryObj<CardStoryProps> = {
  render: ({ title, description, image, showImage, showIcon }: CardStoryProps) => (
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
  ),
};
