//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Node } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { DeckState, OperationHandler } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { Plank } from './Plank';

random.seed(99);

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  AppPlugin.addOperationHandlerModule({
    activate: OperationHandler,
  }),
  Plugin.make,
);

const TestExtension = Capability.contributes(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'storyArticle',
    filter: Surface.makeFilter(AppSurface.Article),
    component: ({ data: { subject } }) =>
      subject ? (
        <Syntax.Root data={subject}>
          <Syntax.Content>
            <Syntax.Viewport>
              <Syntax.Code />
            </Syntax.Viewport>
          </Syntax.Content>
        </Syntax.Root>
      ) : (
        <Loading />
      ),
  }),
);

// A border makes each plank's bounds obvious against the deck surface.
const PLANK_CLASSNAMES = 'border border-separator';

const useNode = (data: Obj.Any, icon: string): Node.Node =>
  useMemo(
    () => ({ id: data.id, type: 'test', data, properties: { label: Obj.getLabel(data) ?? 'Untitled', icon } }),
    [data, icon],
  );

type StoryArgs = {
  /** Render the leaf plank's toolbar as an ancestor breadcrumb trail (narrowed to demonstrate scrolling). */
  breadcrumbs?: boolean;
};

const Story = ({ breadcrumbs }: StoryArgs) => {
  const [organization, person] = useMemo(
    () => [Organization.make({ name: random.company.name() }), Person.make({ fullName: random.person.fullName() })],
    [],
  );
  const organizationNode = useNode(organization, 'ph--building-office--regular');
  const personNode = useNode(person, 'ph--user--regular');

  // Synthetic ancestor chain (structural nodes carry no data); the ECHO object is the leaf.
  const trail = useMemo<Node.Node[]>(
    () => [
      { id: 'root/registry', type: 'test', data: null, properties: { label: 'Plugins', icon: 'ph--squares-four--regular' } },
      { id: 'root/registry/companies', type: 'test', data: null, properties: { label: 'Companies', icon: 'ph--buildings--regular' } },
      { id: 'root/registry/companies/west-coast', type: 'test', data: null, properties: { label: 'West Coast Region', icon: 'ph--map-pin--regular' } },
      organizationNode,
    ],
    [organizationNode],
  );

  // Narrow plank so the trail overflows and the toolbar scrolls horizontally.
  if (breadcrumbs) {
    return (
      <div className='flex h-full gap-3 p-3 bg-deck-surface'>
        <div className='flex h-full shrink-0' style={{ inlineSize: 320 }}>
          <Plank
            node={organizationNode}
            breadcrumbs={trail}
            onNavigate={(id) => console.log('navigate', id)}
            classNames={mx(PLANK_CLASSNAMES, 'grow')}
          />
        </div>
      </div>
    );
  }

  // Two planks side by side; focus either to move attention (sigil/title take the accent color).
  return (
    <div className='flex h-full gap-3 p-3 bg-deck-surface'>
      <Plank node={organizationNode} classNames={PLANK_CLASSNAMES} />
      <Plank node={personNode} classNames={PLANK_CLASSNAMES} />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-deck/components/Plank',
  render: (args) => <Story {...args} />,
  decorators: [
    withPluginManager({ plugins: [...corePlugins(), TestPlugin()], capabilities: [TestExtension] }),
    withAttention(),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type StoryObject = StoryObj<StoryArgs>;

export const Default: StoryObject = {
  args: { breadcrumbs: false },
};

export const Breadcrumbs: StoryObject = {
  args: { breadcrumbs: true },
};
