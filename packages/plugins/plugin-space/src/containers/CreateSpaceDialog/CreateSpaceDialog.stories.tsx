//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { Dialog } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { HueField, IconField } from '../../capabilities/SpaceFormFields.tsx';
import { HueAnnotationId, IconAnnotationId } from '../../types/SpaceSchema.ts';
import { CreateSpaceDialog } from './CreateSpaceDialog.tsx';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <CreateSpaceDialog />
  </Dialog.Root>
);

/** Two templates through the real contribution path (one hidden, so the picker shows one row), and the field pickers. */
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
  // The icon and colour pickers, as the plugin's surfaces provide them.
  Plugin.addModule(
    Capability.inlineModule('story-pickers', { provides: [Capabilities.ReactSurface] }, () =>
      Effect.succeed(
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({
            id: 'storyHue',
            filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, HueAnnotationId)),
            component: HueField,
          }),
          Surface.create({
            id: 'storyIcon',
            filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, IconAnnotationId)),
            component: IconField,
          }),
        ]),
      ),
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
      plugins: [ProcessManagerPlugin.make(), ClientPlugin.make({}), TemplatesPlugin()],
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

/**
 * 1. The icon and colour fields share a row, each control starting under its own label.
 * 2. The action row ends at the fields' edge (the content column), not in the dialog's gutter.
 */
export const TestLayout: Story = {
  play: async () => {
    const dialog = await screen.findByTestId('create-space-dialog');
    const fieldOf = (label: string) => {
      const field = within(dialog).getByText(label).closest<HTMLElement>('[data-scope="field"][data-part="root"]');
      if (!field) {
        throw new Error(`No field for ${label}.`);
      }
      return field;
    };
    await waitFor(() => fieldOf('Color'));
    const icon = fieldOf('Icon').getBoundingClientRect();
    const color = fieldOf('Color').getBoundingClientRect();
    await expect(Math.abs(icon.top - color.top)).toBeLessThanOrEqual(1);
    await expect(color.left).toBeGreaterThan(icon.right);
    for (const label of ['Icon', 'Color']) {
      const field = fieldOf(label);
      const control = field.lastElementChild;
      await expect(
        Math.abs((control?.getBoundingClientRect().left ?? Number.NaN) - field.getBoundingClientRect().left),
      ).toBeLessThanOrEqual(1);
    }

    const name = fieldOf('Name').getBoundingClientRect();
    const save = within(dialog).getByTestId('save-button').getBoundingClientRect();
    await expect(Math.abs(save.right - name.right)).toBeLessThanOrEqual(1);
  },
};
