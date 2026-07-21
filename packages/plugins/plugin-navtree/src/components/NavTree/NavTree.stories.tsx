//
// Copyright 2023 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapability } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { Focus, IconButton, Input, Main, Panel, Toolbar } from '@dxos/react-ui';
import { useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import { withLayout } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { NavTreeContainer } from '#containers';
import { storybookGraphBuilders } from '#testing';
import { translations } from '#translations';

import { NavTreePlugin } from '../../NavTreePlugin';

random.seed(1234);

const StoryState = Capability.makeSingleton<Atom.Atom<{ tab: string }>>()('org.dxos.test.storyState');

const container = 'flex flex-col grow gap-2 p-4 rounded-md';

const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {
  const { hasAttention } = useAttention(attendableId);
  return (
    <Panel.Toolbar classNames='border-b border-separator'>
      <IconButton
        density='lg'
        icon='ph--circle--regular'
        label='Test'
        iconOnly
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames='w-(--dx-rail-action) h-(--dx-rail-action)'
      />
    </Panel.Toolbar>
  );
};

const StoryPlank = ({ attendableId }: { attendableId: string }) => {
  const attentionAttrs = useAttentionAttributes(attendableId);
  const rootElement = useRef<HTMLDivElement | null>(null);

  // NOTE(thure): This is the same workaround as in Plank, but that component is out of scope for this story.
  // TODO(thure): Tabster’s focus group should handle moving focus to Main, but something is blocking it.
  // Attached imperatively because `Focus.Item`/`Panel.Root` expose a narrow (slottable) prop surface.
  useEffect(() => {
    const element = rootElement.current;
    if (!element) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target === element && event.key === 'Escape') {
        element.closest('main')?.focus();
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Focus.Item asChild ref={rootElement}>
      <Panel.Root
        {...attentionAttrs}
        role='article'
        classNames='is-[30rem] shrink-0 bs-full bg-base-surface border-e border-separator'
      >
        <StoryPlankHeading attendableId={attendableId} />
        <Panel.Content classNames='grid'>
          <Toolbar.Root classNames='border-b border-subdued-separator'>
            <Toolbar.Button>Test</Toolbar.Button>
          </Toolbar.Root>

          <div className={mx(container, 'm-2 bg-current-surface')}>
            <Input.Root>
              <Input.Label>Level 1 (group)</Input.Label>
            </Input.Root>
            <div className={mx(container, 'bg-base-surface')}>
              <Input.Root>
                <Input.Label>Level 2 (base)</Input.Label>
                <Input.TextArea placeholder='Enter text' />
              </Input.Root>
            </div>
          </div>
        </Panel.Content>
      </Panel.Root>
    </Focus.Item>
  );
};

const DefaultStory = () => {
  const state = useAtomCapability(StoryState);

  return (
    <Main.Root navigationSidebarState='expanded'>
      <Main.NavigationSidebar label='Navigation' classNames='grid'>
        <NavTreeContainer tab={state.tab} />
      </Main.NavigationSidebar>
      <Main.Content bounce handlesFocus>
        <div className='flex grow overflow-x-auto'>
          <StoryPlank attendableId='space-0:object-0' />
          <StoryPlank attendableId='space-0:object-1' />
        </div>
      </Main.Content>
    </Main.Root>
  );
};

const meta = {
  title: 'plugins/plugin-navtree/components/NavTree',
  component: NavTreeContainer,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({
          initialState: { sidebarState: 'expanded' },
        }),

        NavTreePlugin(),
      ],
      capabilities: () => {
        const storyStateAtom = Atom.make({ tab: 'root/space-0' }).pipe(Atom.keepAlive);
        return [
          Capability.contributes(StoryState, storyStateAtom),
          Capability.contributes(AppCapabilities.AppGraphBuilder, storybookGraphBuilders()),
          Capability.contributes(
            Capabilities.OperationHandler,
            OperationHandlerSet.make(
              Operation.withHandler(LayoutOperation.SwitchWorkspace, ({ subject }) =>
                Effect.gen(function* () {
                  const registry: Registry.Registry = yield* Capability.get(Capabilities.AtomRegistry);
                  registry.set(storyStateAtom, { tab: subject });
                }),
              ),
            ),
          ),
        ];
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof NavTreeContainer>;

export default meta;

type Story = StoryObj<typeof NavTreeContainer>;

export const Default: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    // Plugin startup is async; the treegrid only appears after the Startup event
    // fires and the graph is built. Use a generous timeout so slower CI runners
    // don't race the default 1 s limit.
    const treegridElement = await canvas.findByRole('treegrid', {}, { timeout: 10000 });
    const treegridParent = treegridElement.parentElement;
    if (treegridParent) {
      await userEvent.click(treegridParent);
    }

    // Press Escape
    await userEvent.keyboard('{Escape}');

    // Confirm that focus is on an element with attribute data-main-landmark="0"
    await expect(document.activeElement).toHaveAttribute('data-main-landmark', '0');

    // Press Tab
    await userEvent.keyboard('{Tab}');

    // Confirm that focus is now on an element with data-main-landmark="1"
    await expect(document.activeElement).toHaveAttribute('data-main-landmark', '1');

    // Press Tab
    await userEvent.keyboard('{Tab}');

    // Confirm that focus is now on an element with data-main-landmark="0"
    await expect(document.activeElement).toHaveAttribute('data-main-landmark', '0');

    // Press Shift-Tab
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');

    // Press Enter
    await userEvent.keyboard('{Enter}');

    // Confirm that focus is now on an element with data-attendable-id="space-0:object-0"
    await expect(document.activeElement).toHaveAttribute('data-attendable-id', 'space-0:object-0');

    // Press Escape
    await userEvent.keyboard('{Escape}');

    // Confirm that focus is now on an element with data-main-landmark="1"
    await expect(document.activeElement).toHaveAttribute('data-main-landmark', '1');
  },
};
