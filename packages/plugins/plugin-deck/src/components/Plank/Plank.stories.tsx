//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { random } from '@dxos/random';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Button from '@dxos/react-ui/Button';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { DeckState, OperationHandler } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import type { DeckCapabilities } from '#types';

import { Plank } from './Plank.tsx';

random.seed(99);

const TestPlugin = Plugin.define<DeckCapabilities.DeckPluginOptions>(pluginMeta).pipe(
  Plugin.addModule(DeckState),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

const TestExtension = Capability.contribute(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'storyArticle',
    filter: Surface.makeFilter(AppSurface.Article),
    component: ({ data: { subject } }) => (subject ? <JsonHighlighter data={subject} /> : <Loading />),
  }),
);

// A border makes each plank's bounds obvious against the deck surface.
const PLANK_CLASSNAMES = 'border border-separator';

const useNode = (data: Obj.Any, icon: string): AppGraphNode.Node =>
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
    <div className='flex h-full gap-3 p-3 dx-deck-surface'>
      <Plank node={organizationNode} classNames={PLANK_CLASSNAMES} />
      <Plank node={personNode} classNames={PLANK_CLASSNAMES} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-deck/components/Plank',
  decorators: [
    withPluginManager({ plugins: [...CorePlugins.make(), TestPlugin()], capabilities: [TestExtension] }),
    withAttention(),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <DefaultStory /> };

/** With a breadcrumb trail (flat mode) the header's controls still sit at its end, not straight after the trail. */
const BreadcrumbStory = () => {
  const [organization] = useMemo(() => [Organization.make({ name: random.company.name() })], []);
  const node = useNode(organization, 'ph--building-office--regular');
  return (
    <div className='flex h-full p-3 dx-deck-surface'>
      <Plank
        node={node}
        classNames={[PLANK_CLASSNAMES, 'w-[40rem]']}
        breadcrumbs={[{ id: 'parent', label: 'Parent' }]}
        controls={<Button.Root icon='ph--x--regular' iconOnly label='Close' data-testid='plank.close' />}
      />
    </div>
  );
};

export const TestBreadcrumbControlsAtEnd: Story = {
  render: () => <BreadcrumbStory />,
  play: async ({ canvasElement }) => {
    const close = await within(canvasElement).findByTestId('plank.close');
    const toolbar = close.closest<HTMLElement>('[data-tauri-drag-region]');
    await expect(toolbar).not.toBeNull();
    await expect((toolbar?.getBoundingClientRect().right ?? 0) - close.getBoundingClientRect().right).toBeLessThan(8);
  },
};

/** The same trail one level apart: Sessions as the current page, then as a link under New Chat. */
const BreadcrumbDepthStory = () => {
  const [sessions, chat] = useMemo(
    () => [Organization.make({ name: 'Sessions' }), Organization.make({ name: 'New Chat' })],
    [],
  );
  const sessionsNode = useNode(sessions, 'ph--building-office--regular');
  const chatNode = useNode(chat, 'ph--building-office--regular');
  return (
    <div className='flex flex-col h-full gap-3 p-3 dx-deck-surface'>
      <div data-testid='depth-1' className='flex'>
        <Plank
          node={sessionsNode}
          classNames={[PLANK_CLASSNAMES, 'w-[40rem]']}
          breadcrumbs={[{ id: 'plugin', label: 'Composer Plugin' }]}
        />
      </div>
      <div data-testid='depth-2' className='flex'>
        <Plank
          node={chatNode}
          classNames={[PLANK_CLASSNAMES, 'w-[40rem]']}
          breadcrumbs={[
            { id: 'plugin', label: 'Composer Plugin' },
            { id: 'sessions', label: 'Sessions' },
          ]}
        />
      </div>
    </div>
  );
};

/**
 * A crumb keeps its size and position as the reader moves down the hierarchy: Sessions as the current page and as a
 * link sit at the same place, the same size, and the chevron before it does not move.
 */
export const TestBreadcrumbStableAcrossDepth: Story = {
  render: () => <BreadcrumbDepthStory />,
  play: async ({ canvasElement }) => {
    const crumb = (depth: string, text: string) => {
      const nav = within(within(canvasElement).getByTestId(depth)).getByRole('navigation');
      return within(nav).getByText(text);
    };
    const firstSeparator = (depth: string) =>
      within(canvasElement).getByTestId(depth).querySelector<HTMLElement>('[data-part="separator"]');
    await waitFor(() => crumb('depth-2', 'Sessions'));

    const current = crumb('depth-1', 'Sessions');
    const link = crumb('depth-2', 'Sessions');
    const box = (element: HTMLElement) => element.getBoundingClientRect();
    await expect(Math.abs(box(current).left - box(link).left)).toBeLessThanOrEqual(0.5);
    await expect(Math.abs(box(current).width - box(link).width)).toBeLessThanOrEqual(0.5);
    await expect(Math.abs(box(current).height - box(link).height)).toBeLessThanOrEqual(0.5);
    for (const property of ['fontSize', 'fontWeight', 'lineHeight', 'paddingLeft', 'paddingRight'] as const) {
      await expect(getComputedStyle(current)[property]).toBe(getComputedStyle(link)[property]);
    }
    const separatorA = firstSeparator('depth-1');
    const separatorB = firstSeparator('depth-2');
    await expect(
      Math.abs(
        (separatorA?.getBoundingClientRect().left ?? Number.NaN) - (separatorB?.getBoundingClientRect().left ?? 0),
      ),
    ).toBeLessThanOrEqual(0.5);
  },
};
