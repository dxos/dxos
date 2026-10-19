//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as PluginNS from '@dxos/app-framework/Plugin';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import { random } from '@dxos/random';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { getHashHue } from '@dxos/ui-theme';

import { translations } from '#translations';
import { RegistryTagType } from '#types';

import { PluginList } from './PluginList.tsx';

random.seed(1);

const icons = [
  'ph--bug--regular',
  'ph--compass--regular',
  'ph--kanban--regular',
  'ph--table--regular',
  'ph--gear--regular',
  'ph--github-logo--regular',
];

const DefaultStory = () => {
  const [plugins] = useState<Plugin.Plugin[]>(
    random.helpers.multiple(
      () =>
        PluginNS.define(
          PluginNS.makeMeta({
            key: DXN.make('org.dxos.plugin.test'),
            name: `${random.commerce.productName()}`,
            description: random.lorem.sentences(Math.ceil(Math.random() * 3)),
            tags: random.helpers.uniqueArray([...RegistryTagType.literals], Math.floor(Math.random() * 3)),
            icon: { key: random.helpers.arrayElement(icons), hue: getHashHue(random.string.uuid()) },
            homePage: random.datatype.boolean({ probability: 0.5 }) ? random.internet.url() : undefined,
            source: random.internet.url(),
          }),
        ).pipe(PluginNS.make)(),
      { count: 32 },
    ),
  );
  const [enabled, setEnabled] = useState<string[]>([]);

  const handleChange = (id: string, enabled: boolean) => {
    setEnabled((plugins) => (enabled ? [...plugins, id] : plugins.filter((plugin) => plugin === id)));
  };

  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container gutter='md' padBlock>
              <PluginList plugins={plugins} enabled={enabled} onChange={handleChange} hasSettings={() => true} />
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-registry/components/PluginList',
  component: PluginList,
  render: DefaultStory,
  parameters: {
    translations,
  },
} satisfies Meta<typeof PluginList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'dx-deck-surface' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export const FullScreen: Story = {
  decorators: [withTheme(), withLayout({ scroll: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Each card's tile takes the plugin's hue, its tags read in capitals, and its switch toggles from a click.
 */
export const Test: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'dx-deck-surface' })],
  parameters: {
    layout: 'fullscreen',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = await canvas.findByRole('list', { name: 'plugins' });
    const [card] = within(list).getAllByRole('listitem');
    await expect(card.querySelector('[data-part="tile"]')?.getAttribute('data-hue')).toBeTruthy();
    for (const tag of card.querySelectorAll('[data-scope="tag"]')) {
      await expect(tag.textContent).toBe(tag.textContent?.toUpperCase());
    }
    const toggle = within(card).getByRole('switch');
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
  },
};
