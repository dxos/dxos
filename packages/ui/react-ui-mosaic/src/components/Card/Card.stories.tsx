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

// https://m2.material.io/components/cards#anatomy
// - Drag handle/menu (via surface)
// - Action bar

const DefaultStory = ({ title, description, indent, image }: CardStoryProps) => {
  // TODO(burdon): Remove padding from Card.Heading; instead Card.Section should provide padding.
  return (
    <Card.Root classNames='is-cardMinWidth max-is-cardMinWidth'>
      <Card.Toolbar>
        <Card.DragHandle toolbarItem />
        <Card.Heading padding={false}>{title}</Card.Heading>
        <Card.Menu items={[]} />
      </Card.Toolbar>
      {image && <Card.Poster alt={title} image={image} />}
      {/* <Card.Section fullWidth={fullWidth}>
        <Card.Heading padding={false}>{title}</Card.Heading>
      </Card.Section> */}
      {description && (
        <Card.Section indent={indent} classNames='text-description line-clamp-3'>
          {description}
          {/* <Card.Text classNames='text-description line-clamp-3'>{description}</Card.Text> */}
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
