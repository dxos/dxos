//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { AccessToken } from '@dxos/link';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { Settings } from '#types';

import { CodeSettings } from './CodeSettings';

// The container reads and writes the contributed settings entry, so the story owns one per render.
const DefaultStory = () => {
  const subject = useMemo(
    () => ({
      prefix: pluginMeta.profile.key,
      schema: Settings.Settings,
      atom: Atom.make<Settings.Settings>({}).pipe(Atom.keepAlive),
    }),
    [],
  );

  return <CodeSettings subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-code/containers/CodeSettings',
  render: () => <DefaultStory />,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [AccessToken.AccessToken] }),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
