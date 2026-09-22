//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, screen, waitFor } from 'storybook/test';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { Dialog } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { CreateSpaceDialog } from './CreateSpaceDialog.tsx';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <CreateSpaceDialog />
    </Dialog.Overlay>
  </Dialog.Root>
);

/** Two templates through the real contribution path; one is hidden, so the picker shows one row. */
const TemplatesPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('com.example.plugin.templates'), name: 'Templates' }),
).pipe(
  Plugin.addModule(
    AppCapability.spaceTemplates(() =>
      Promise.resolve({
        default: [
          {
            id: 'com.example.template.visible',
            label: 'Roastery',
            description: 'Listed in the picker.',
            icon: 'ph--potted-plant--regular',
            hue: 'amber',
            apply: () => Promise.resolve(),
          },
          {
            id: 'com.example.template.hidden',
            label: 'Fixture',
            description: 'Reachable by id only.',
            hidden: true,
            apply: () => Promise.resolve(),
          },
        ],
      }),
    ),
  ),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-space/containers/CreateSpaceDialog',
  component: CreateSpaceDialog,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [ProcessManagerPlugin(), ClientPlugin.make({}), TemplatesPlugin()],
    }),
  ],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    // The dialog's action row is `Form.Actions`, whose labels live in the form package's bundle.
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof CreateSpaceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Templates: Story = {
  // `screen`, not the story canvas: the dialog renders through a portal on `document.body`.
  play: async () => {
    await waitFor(() => expect(screen.getByText('Roastery')).toBeInTheDocument(), { timeout: 10_000 });
    await expect(screen.queryByText('Fixture')).toBeNull();
  },
};
