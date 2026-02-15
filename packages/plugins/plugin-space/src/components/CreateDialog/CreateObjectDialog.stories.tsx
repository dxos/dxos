//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Collection } from '@dxos/schema';
import { translations as shellTranslations } from '@dxos/shell/react';

import { translations } from '../../translations';

import { CreateObjectDialog, type CreateObjectDialogProps } from './CreateObjectDialog';

const DefaultStory = (props: CreateObjectDialogProps) => {
  return (
    <Dialog.Root open>
      <Dialog.Overlay blockAlign='start'>
        <CreateObjectDialog {...props} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

// TODO(wittjosiah): Story should be for CreateObjectPanel.
const meta = {
  title: 'plugins/plugin-space/CreateObjectDialog',
  component: CreateObjectDialog,
  render: DefaultStory,
  decorators: [
    withTheme(), // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({
      plugins: [RuntimePlugin(), OperationPlugin()],
    }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Collection.Collection],
    }),
  ],
  parameters: {
    translations: [...translations, ...shellTranslations],
  },
  args: {},
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Typename: Story = {
  args: { typename: Collection.Collection.typename },
};

export const TargetSpace: Story = {
  render: (args) => {
    const db = useDatabase();

    if (!db) {
      return <></>;
    }

    return <DefaultStory {...args} target={db} />;
  },
};

export const TargetCollection: Story = {
  render: (args) => {
    const db = useDatabase();
    const [collection] = useQuery(db, Filter.type(Collection.Collection));

    useEffect(() => {
      db?.add(Obj.make(Collection.Collection, { name: 'My Collection', objects: [] }));
    }, [db]);

    if (!collection) {
      return <></>;
    }

    return <DefaultStory {...args} target={collection} />;
  },
};
