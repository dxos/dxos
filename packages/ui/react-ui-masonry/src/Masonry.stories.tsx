//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Form } from '@dxos/react-ui-form';
import { DataType } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';

import { Masonry } from './Masonry';

const StoryItem = ({ data }: { data: DataType.Organization }) => {
  if (Obj.instanceOf(DataType.Organization, data)) {
    const org = data as Obj.Obj<DataType.Organization>;
    return <Form values={org} schema={DataType.Organization} autoSave />;
  }
  return <span>{(data as any)?.id ?? 'Unknown item'}</span>;
};

const DefaultStory = () => {
  const { space } = useClientProvider();
  const organizations = useQuery(space, Filter.type(DataType.Organization));

  return (
    <Masonry.Root<DataType.Organization>
      items={organizations}
      render={StoryItem}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto'
    />
  );
};

const meta = {
  title: 'ui/react-ui-masonry/Masonry',
  decorators: [
    withTheme,
    withClientProvider({
      types: [DataType.Organization],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const factory = createObjectFactory(space.db, faker as any);
        await factory([{ type: DataType.Organization, count: 36 }]);
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
