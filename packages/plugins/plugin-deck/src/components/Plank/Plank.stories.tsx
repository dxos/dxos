//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Node } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { DeckState, OperationHandler } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { Plank } from './Plank';

random.seed(99);

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule(DeckState),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

const TestExtension = Capability.provide(
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

// Two planks side by side; focus either to move attention (sigil/title take the accent color).
const DefaultStory = () => {
  const [organization, person] = useMemo(
    () => [Organization.make({ name: random.company.name() }), Person.make({ fullName: random.person.fullName() })],
    [],
  );
  const organizationNode = useNode(organization, 'ph--building-office--regular');
  const personNode = useNode(person, 'ph--user--regular');

  return (
    <div className='flex h-full gap-3 p-3 bg-deck-surface'>
      <Plank node={organizationNode} classNames={PLANK_CLASSNAMES} />
      <Plank node={personNode} classNames={PLANK_CLASSNAMES} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-deck/components/Plank',
  decorators: [
    withPluginManager({ plugins: [...corePlugins(), TestPlugin()], capabilities: [TestExtension] }),
    withAttention(),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <DefaultStory /> };
