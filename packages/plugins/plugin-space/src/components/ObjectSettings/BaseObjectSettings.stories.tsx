//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { type Obj, Tag } from '@dxos/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { BaseObjectSettings } from './BaseObjectSettings';

const DefaultStory = () => {
  const { space } = useClientProvider();
  const [object, setObject] = useState<Obj.Any>();

  useEffect(() => {
    if (space && !object) {
      const object = space.db.add(DataType.Project.make());
      setObject(object as Obj.Any);
    }
  }, [space, object]);

  if (!object) {
    return null;
  }

  return <BaseObjectSettings object={object} classNames='is-[20rem]' />;
};

const meta = {
  title: 'plugins/plugin-space/BaseObjectSettings',
  component: BaseObjectSettings as any,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [DataType.Project.Project, Tag.Tag],
      onCreateSpace: async ({ space }) => {
        space.db.add(Tag.make({ label: 'Tag 1' }));
        space.db.add(Tag.make({ label: 'Tag 2' }));
        space.db.add(Tag.make({ label: 'Tag 3' }));
      },
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
