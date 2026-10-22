//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Filter } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Presentation, PresenterOperation } from '#types';

import { PresentationArticle } from './PresentationArticle.tsx';

/**
 * Stands in for the deck plugin: `SetPresenting` flips a flag that the layout reports as
 * `solo--fullscreen`, which is all the article reads.
 */
const createPresenterStoryPlugin = () => {
  const presentingAtom = Atom.make(false).pipe(Atom.keepAlive);
  const layoutAtom = Atom.make((get): AppCapabilities.Layout => ({
    mode: get(presentingAtom) ? 'solo--fullscreen' : 'storybook',
    dialogOpen: false,
    sidebarOpen: false,
    complementarySidebarOpen: false,
    workspace: 'default',
    active: [],
    inactive: [],
    scrollIntoView: undefined,
  }));
  const setPresenting = PresenterOperation.SetPresenting.pipe(
    Operation.withHandler(({ state }) =>
      Effect.gen(function* () {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        registry.set(presentingAtom, state);
      }),
    ),
  );

  return Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.presentationArticle'), name: 'PresentationArticleStory' }),
  ).pipe(
    Plugin.addModule({
      id: 'layout',
      provides: [AppCapabilities.Layout, Capabilities.OperationHandler],
      activate: () =>
        Effect.succeed([
          Capability.contribute(AppCapabilities.Layout, layoutAtom),
          Capability.contribute(Capabilities.OperationHandler, OperationHandlerSet.make(setPresenting)),
        ]),
    }),
    Plugin.make,
  );
};

const DefaultStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  if (!presentation) {
    return <Loading />;
  }

  return <PresentationArticle role='article' attendableId='story' subject={presentation} />;
};

const meta = {
  title: 'plugins/plugin-presenter/containers/PresentationArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Presentation.Presentation, Text.Text, Markdown.Document],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const presentation = space.db.add(Presentation.make({ name: 'Demo', slides: ['# One', '# Two', '# Three'] }));
        Presentation.link(presentation, space.db.add(Markdown.make({ name: 'Notes', content: '# Notes' })));
        space.db.add(Markdown.make({ name: 'Appendix', content: '# Appendix' }));
        await space.db.flush({ indexes: true });
      },
    }),
    withPluginManager({ plugins: [ProcessManagerPlugin.make(), createPresenterStoryPlugin()()] }),
    // Outermost, so the plugin manager's atom registry is not replaced by the decorator's own.
    withAttention(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const LOAD_TIMEOUT = { timeout: 10_000 };

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Add slide' }));
    await expect(await canvas.findByText('1 / 5')).toBeVisible();
  },
};

/** Arrow keys turn the page on mount, with no click into the deck first. */
export const FocusOnMount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 4')).toBeVisible();
  },
};

/** The toolbar button enters fullscreen; ESC returns inline with the keys still live. */
export const Fullscreen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await userEvent.click(canvas.getByTestId('presenter.fullscreen'));
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('presenter.overlay')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 4')).toBeVisible();
  },
};

/** The section picker offers unlinked objects only, and links the one picked. */
export const LinkSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await userEvent.click(canvas.getByTestId('presenter.section-picker'));
    const option = await screen.findByRole('option', { name: /Appendix/ }, { timeout: 5_000 });
    await expect(screen.queryByRole('option', { name: /Notes/ })).toBeNull();
    await expect(screen.queryByRole('option', { name: /Demo/ })).toBeNull();
    await userEvent.click(option);
    await expect(await canvas.findByText('1 / 5')).toBeVisible();
  },
};
