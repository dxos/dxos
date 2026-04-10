//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter } from '@dxos/client/echo';
import { random } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization } from '@dxos/types';

import { Masonry, MasonryRootProps } from './Masonry';

const StoryItem = ({ data: { image, name, description } }: { data: Organization.Organization }) => {
  return (
    <Card.Root>
      <Card.Toolbar>
        <Card.Icon icon='ph--building-office--regular' />
        <Card.Title>{name}</Card.Title>
      </Card.Toolbar>
      <Card.Poster alt={name!} {...(image ? { image } : { icon: 'ph--building-office--regular' })} />
      {description && (
        <Card.Section classNames='px-2 pb-2'>
          <Card.Text variant='description'>{description}</Card.Text>
        </Card.Section>
      )}
    </Card.Root>
  );
};

const DefaultStory = (props: MasonryRootProps) => {
  const { space } = useClientStory();
  const organizations = useQuery(space?.db, Filter.type(Organization.Organization));

  return (
    <Masonry.Root {...props} Tile={StoryItem}>
      <Masonry.Content items={organizations} />
    </Masonry.Root>
  );
};

const meta = {
  title: 'ui/react-ui-masonry/Masonry',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Organization.Organization],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const factory = createObjectFactory(space.db, random as any);
        await factory([{ type: Organization.Organization, count: 36 }]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
