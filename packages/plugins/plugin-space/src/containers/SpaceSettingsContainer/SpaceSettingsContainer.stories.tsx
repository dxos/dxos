//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SpaceSettingsContainer } from './SpaceSettingsContainer.tsx';

const Story = (props: Partial<AppSurface.SpaceArticleProps>) => {
  const { space } = useClientStory();
  if (!space) {
    return <Loading />;
  }

  return <SpaceSettingsContainer role='article' attendableId={space.id} {...props} space={space} />;
};

const meta = {
  title: 'plugins/plugin-space/containers/SpaceSettingsContainer',
  component: SpaceSettingsContainer,
  render: Story,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ createIdentity: true, createSpace: true }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: [ProcessManagerPlugin.make()] }),
  ],
  parameters: {
    translations,
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SpaceSettingsContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryObj<typeof SpaceSettingsContainer> = {};
