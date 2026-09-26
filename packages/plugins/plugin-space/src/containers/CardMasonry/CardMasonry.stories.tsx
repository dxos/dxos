//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Organization, Person, Task } from '@dxos/types';

import { translations } from '#translations';

import * as SpacePlugin from '../../SpacePlugin.ts';
import { CardMasonry } from './CardMasonry.tsx';

const OWNER_TITLE = 'Ship the launch';

/** A task and the three objects it produced, linked the way `Task.addArtifact` links them. */
const createObjects = (db: Database.Database): void => {
  const task = db.add(Obj.make(Task.Task, { title: OWNER_TITLE, status: 'started' }));
  const artifacts = [
    db.add(Obj.make(Organization.Organization, { name: 'Acme' })),
    db.add(Obj.make(Person.Person, { fullName: 'Alice Ashe' })),
    db.add(Obj.make(Task.Task, { title: 'Send the contract', status: 'todo' })),
  ];
  for (const artifact of artifacts) {
    Task.addArtifact(task, artifact);
  }
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const owner = tasks.find((task) => task.title === OWNER_TITLE);
  if (!owner) {
    return <Loading />;
  }

  return <CardMasonry objects={owner.artifacts ?? []} />;
};

/** Nothing to show: the grid renders no region at all, rather than an empty bordered one. */
const EmptyStory = () => <CardMasonry objects={[]} />;

/** Per story, so a story can add plugin-space itself and render the grid only through its surface. */
const withPlugins = (extraPlugins: Plugin.Plugin[] = []) =>
  withPluginManager({
    capabilities: [Capability.contribute(AppCapabilities.Translations, translations)],
    plugins: [
      ...corePlugins(),
      ...extraPlugins,
      StorybookPlugin.make({}),
      // Contributes the `CardContent` surfaces the cards' bodies render through; without it a card
      // is its header alone, which is the fallback rather than the story.
      PreviewPlugin.make(),
      ClientPlugin.make({
        types: [Organization.Organization, Person.Person, Task.Task],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            createObjects(space.db);
            yield* Effect.promise(() => space.db.flush());
          }),
      }),
    ],
  });

const meta = {
  title: 'plugins/plugin-space/containers/CardMasonry',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withPlugins()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // One card per ref, labelled from each type's own annotations — the grid is type-agnostic.
    await expect(canvas.findByText('Acme', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Alice Ashe', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Send the contract', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};

export const Empty: Story = {
  decorators: [withPlugins()],
  render: EmptyStory,
  play: async ({ canvasElement }) => {
    // Renders nothing, so a host with no objects to show is left with no region to lay out — and no
    // separator line under content that has nothing beneath it.
    await waitFor(() => expect(canvasElement.textContent?.trim()).toBe(''), { timeout: 10_000 });
  },
};

/**
 * The grid reached only through `AppSurface.CardMasonry`, as a host outside plugin-space renders it.
 * Nothing else requests one of plugin-space's surface roles here, so the grid appears only if
 * requesting `cardMasonry` itself activates the plugin's surface module.
 */
const SurfaceStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const owner = tasks.find((task) => task.title === OWNER_TITLE);
  if (!owner) {
    return <Loading />;
  }

  return <Surface.Surface type={AppSurface.CardMasonry} data={{ objects: owner.artifacts ?? [] }} limit={1} />;
};

export const ViaSurface: Story = {
  decorators: [withPlugins([SpacePlugin.make({})])],
  render: SurfaceStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('Acme', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};
