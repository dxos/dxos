//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { ActivationEvents, Capabilities, Capability, Plugin, Role } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ModuleContainer } from './ModuleContainer';

// Example module role tokens (role-only dispatch). A real storybook defines these alongside its
// module surfaces; here they exercise the container in isolation from any plugin.
const PanelA = Role.make('org.dxos.storybook.storyModules.panelA');
const PanelB = Role.make('org.dxos.storybook.storyModules.panelB');
const PanelC = Role.make('org.dxos.storybook.storyModules.panelC');

/** Trivial surface component: shows its label and the active space it resolved. */
const ExamplePanel = ({ label }: { label: string }) => {
  const space = useActiveSpace();
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{label}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='p-2'>
        <p className='text-sm text-description'>space: {space?.id ?? '…'}</p>
      </Panel.Content>
    </Panel.Root>
  );
};

// Contributes the example surfaces so the container's layout tokens resolve.
const ExampleSurfacesPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.storybook.storyModules'), name: 'Story Modules Example' }),
).pipe(
  Plugin.addModule({
    id: 'org.dxos.storybook.storyModules.surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          Surface.create({
            id: 'panelA',
            filter: Surface.makeFilter(PanelA),
            component: () => <ExamplePanel label='Panel A' />,
          }),
          Surface.create({
            id: 'panelB',
            filter: Surface.makeFilter(PanelB),
            component: () => <ExamplePanel label='Panel B' />,
          }),
          Surface.create({
            id: 'panelC',
            filter: Surface.makeFilter(PanelC),
            component: () => <ExamplePanel label='Panel C' />,
          }),
        ]),
      ),
  }),
  Plugin.make,
);

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/story-modules/ModuleContainer',
  render: ModuleContainer,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
            }),
        }),
        StorybookPlugin({}),
        ExampleSurfacesPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Single module. */
export const Default: Story = {
  args: {
    layout: [[PanelA]],
  },
};

/** One module per column. */
export const Columns: Story = {
  args: {
    layout: [[PanelA], [PanelB], [PanelC]],
  },
};

/** Mixed grid: two stacked modules in the first column, one in the second. */
export const Grid: Story = {
  args: {
    layout: [[PanelA, PanelB], [PanelC]],
  },
};
