//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Pipeline } from '@dxos/types';

import { translations } from '../../translations';
import { ObjectProperties } from './ObjectProperties';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [object] = useQuery(space?.db, Filter.type(Pipeline.Pipeline));
  if (!object) {
    return <Loading />;
  }

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={object} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/ObjectProperties',
  component: ObjectProperties as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Pipeline.Pipeline, Tag.Tag],
      onCreateSpace: async ({ space }) => {
        space.db.add(Pipeline.make());
        space.db.add(Tag.make({ label: 'Tag 1' }));
        space.db.add(Tag.make({ label: 'Tag 2' }));
        space.db.add(Tag.make({ label: 'Tag 3' }));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
