//
// Copyright 2023 DXOS.org
//

import '@dxos/lit-ui/dx-tag-picker.pcss';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Obj, Tag } from '@dxos/echo';
import { Expando } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { BaseObjectSettings } from './BaseObjectSettings';

const DefaultStory = () => {
  const { space } = useClientProvider();
  const [object, setObject] = useState<Obj.Any>();

  useEffect(() => {
    if (space && !object) {
      const object = space.db.add(Obj.make(Expando, {}));
      setObject(object as Obj.Any);
    }
  }, [space, object]);

  if (!object) {
    return null;
  }

  return <BaseObjectSettings object={object} />;
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
      types: [Tag.Tag],
      onCreateSpace: async ({ space }) => {
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
