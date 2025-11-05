//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter } from '@dxos/client/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Card, cardNoSpacing, cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';

import { Masonry } from './Masonry';

const StoryItem = ({ data: { image, name, description } }: { data: DataType.Organization.Organization }) => {
  return (
    <Card.StaticRoot>
      <Card.Poster alt={name!} {...(image ? { image } : { icon: 'ph--building-office--regular' })} />
      <div role='none' className={mx('flex items-center gap-2', cardSpacing)}>
        <Card.Heading classNames={cardNoSpacing}>{name}</Card.Heading>
      </div>
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
    </Card.StaticRoot>
  );
};

const DefaultStory = () => {
  const { space } = useClientProvider();
  const organizations = useQuery(space, Filter.type(DataType.Organization.Organization));

  return (
    <Masonry.Root<DataType.Organization.Organization>
      items={organizations}
      render={StoryItem}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto p-4'
    />
  );
};

const meta = {
  title: 'ui/react-ui-masonry/Masonry',
  decorators: [
    withTheme,
    withClientProvider({
      types: [DataType.Organization.Organization],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const factory = createObjectFactory(space.db, faker as any);
        await factory([{ type: DataType.Organization.Organization, count: 36 }]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Masonry>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};
