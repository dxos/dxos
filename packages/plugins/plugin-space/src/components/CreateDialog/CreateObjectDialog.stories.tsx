//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';

import { create, Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { osTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { CreateObjectDialog, type CreateObjectDialogProps } from './CreateObjectDialog';
import translations from '../../translations';
import { CollectionType } from '../../types';

const Story = (args: CreateObjectDialogProps) => {
  return (
    <Dialog.Root open>
      <Dialog.Overlay blockAlign='start'>
        <CreateObjectDialog {...args} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

// TODO(wittjosiah): Story should be for CreateObjectPanel.
const meta: Meta<typeof CreateObjectDialog> = {
  title: 'plugins/plugin-space/CreateObjectDialog',
  component: CreateObjectDialog,
  render: Story,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [CollectionType] }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: {
    translations: [...translations, osTranslations],
  },
  args: {
    schemas: [CollectionType],
  },
};

export default meta;

export const Default: StoryObj<typeof CreateObjectDialog> = {};

export const Typename: StoryObj<typeof CreateObjectDialog> = {
  args: { typename: CollectionType.typename },
};

export const TargetSpace: StoryObj<typeof CreateObjectDialog> = {
  render: (args) => {
    const space = useSpace();

    if (!space) {
      return <></>;
    }

    return <Story {...args} target={space} />;
  },
};

export const TargetCollection: StoryObj<typeof CreateObjectDialog> = {
  render: (args) => {
    const space = useSpace();
    const [collection] = useQuery(space, Filter.schema(CollectionType));

    useEffect(() => {
      if (space) {
        space.db.add(create(CollectionType, { name: 'My Collection', objects: [], views: {} }));
      }
    }, [space]);

    if (!collection) {
      return <></>;
    }

    return <Story {...args} target={collection} />;
  },
};
