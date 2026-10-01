//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { useEffect, useRef } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { random } from '@dxos/random';
import { useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import { Next } from '@dxos/react-ui/next';
import { withLayout } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { NavTreeContainer } from '#containers';
import { NavTreePlugin } from '#plugin';
import { type StorybookGraphOptions, storybookGraphBuilders } from '#testing';
import { translations } from '#translations';

random.seed(1234);

const StoryState = Capability.makeSingleton<Atom.Atom<{ tab: string }>>()('org.dxos.test.storyState');

// How many times a row's selection asked the layout to open it: the observable a story has, since
// the tree's selection here is a model the stubbed layout never updates.
let opens = 0;

const container = 'flex flex-col grow gap-2 p-4 rounded-md';

const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {
  const { hasAttention } = useAttention(attendableId);
  return (
    <Next.Panel.Header classNames='border-b border-separator'>
      <Next.Button
        size='lg'
        icon='ph--circle--regular'
        label='Test'
        iconOnly
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames='w-(--dx-rail-action) h-(--dx-rail-action)'
      />
    </Next.Panel.Header>
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
    <Next.Focus.Item asChild ref={rootElement}>
      <Next.Panel.Root
        {...attentionAttrs}
        role='article'
        classNames='w-[30rem] shrink-0 h-full dx-base-surface border-e border-separator'
      >
        <StoryPlankHeading attendableId={attendableId} />
        <Next.Panel.Body classNames='grid'>
          <Next.Toolbar.Root classNames='border-b border-subdued-separator'>
            <Next.Button>Test</Next.Button>
          </Next.Toolbar.Root>

          <div className={mx(container, 'm-2 bg-current-surface')}>
            <Next.Field.Root>
              <Next.Field.Label>Level 1 (group)</Next.Field.Label>
            </Next.Field.Root>
            <div className={mx(container, 'dx-base-surface')}>
              <Next.Field.Root>
                <Next.Field.Label>Level 2 (base)</Next.Field.Label>
                <Next.Textarea placeholder='Enter text' />
              </Next.Field.Root>
            </div>
          </div>
        </Next.Panel.Body>
      </Next.Panel.Root>
    </Next.Focus.Item>
  );
};

const DefaultStory = () => {
  const state = useAtomCapability(StoryState);

  return (
    <Next.Main.Root navigationSidebarState='expanded'>
      <Next.Main.NavigationSidebar label='Navigation' classNames='grid'>
        <NavTreeContainer tab={state.tab} />
      </Next.Main.NavigationSidebar>
      <Next.Main.Content bounce handlesFocus>
        <div className='flex grow overflow-x-auto'>
          <StoryPlank attendableId='space-0:object-0' />
          <StoryPlank attendableId='space-0:object-1' />
        </div>
      </Next.Main.Content>
    </Next.Main.Root>
  );
};

/** A workspace absent from the graph (a dead link, or persisted deck state after a profile switch). */
const MISSING_WORKSPACE = 'root/B4NRQGGJ7XSDT4WMGXCTZNBLTDYIWGXNQIB6JW3AVLW3G';

const UnavailableWorkspaceStory = () => {
  const { invokePromise } = useOperationInvoker();
  useEffect(() => {
    void invokePromise(LayoutOperation.SwitchWorkspace, { subject: MISSING_WORKSPACE });
  }, [invokePromise]);

  return <DefaultStory />;
};

const navTreeDecorators = (graphOptions?: StorybookGraphOptions) => [
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
    plugins: [
      ...corePlugins(),
      StorybookPlugin.make({
        initialState: { sidebarState: 'expanded' },
      }),

      NavTreePlugin(),
    ],
    capabilities: () => {
      const storyStateAtom = Atom.make({ tab: 'root/space-0' }).pipe(Atom.keepAlive);
      return [
        Capability.contribute(StoryState, storyStateAtom),
        Capability.contribute(AppCapabilities.AppGraphBuilder, storybookGraphBuilders(graphOptions)),
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.SwitchWorkspace, ({ subject }) =>
              Effect.gen(function* () {
                const registry: Registry.AtomRegistry = yield* Capability.get(Capabilities.AtomRegistry);
                registry.set(storyStateAtom, { tab: subject });
              }),
            ),
            Operation.withHandler(LayoutOperation.Open, () =>
              Effect.sync((): readonly string[] => {
                opens += 1;
                return [];
              }),
            ),
          ),
        ),
      ];
    },
  }),
];

const meta = {
  title: 'plugins/plugin-navtree/components/NavTree',
  component: NavTreeContainer,
  render: DefaultStory,
  decorators: navTreeDecorators(),
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

    // Plugin startup is async; the tree only appears after the Startup event
    // fires and the graph is built. Use a generous timeout so slower CI runners
    // don't race the default 1 s limit.
    const treeElement = await canvas.findByRole('tree', {}, { timeout: 10000 });
    const treeParent = treeElement.parentElement;
    if (treeParent) {
      await userEvent.click(treeParent);
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

/** Opening a row's action menu is not choosing the row: the menu stays open and the selection stays put. */
export const RowMenu: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const tree = await canvas.findByRole('tree', {}, { timeout: 10000 });
    // A row's actions arrive once the row is hovered; level 0 is the workspace header outside the
    // tree, so a row's menu is level 1 or deeper.
    await userEvent.hover(await within(tree).findByText('Object 2', {}, { timeout: 10000 }));
    const trigger = (
      await within(tree).findAllByTestId(/navtree\.treeItem\.actionsLevel[1-9]/, {}, { timeout: 10000 })
    )[0];
    // The `treeitem` carries `aria-selected` for a leaf and a branch alike (a branch's visible row is
    // its control, and its columns are siblings of it, not descendants).
    const row = trigger.closest<HTMLElement>('[role="treeitem"]')!;
    const selectedBefore = row.getAttribute('aria-selected');

    opens = 0;
    await userEvent.click(trigger);
    const menu = await within(document.body).findByRole('menu');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('data-state', 'open');
    await expect(row.getAttribute('aria-selected')).toBe(selectedBefore);
    // The operation is invoked asynchronously, so a beat before reading the count.
    await new Promise((resolve) => setTimeout(resolve, 250));
    await expect(opens).toBe(0);

    // The row itself still navigates.
    await userEvent.keyboard('{Escape}');
    await userEvent.click(within(row).getByTestId('treeItem.heading'));
    await waitFor(() => expect(opens).toBe(1));
  },
};

export const UnavailableWorkspace: Story = {
  render: UnavailableWorkspaceStory,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('navtree.workspace.unavailable', {}, { timeout: 15000 });
  },
};

export const PendingWorkspaces: Story = {
  decorators: navTreeDecorators({ spaces: 'pending' }),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const items = await canvas.findAllByTestId('spacePlugin.space.pending', {}, { timeout: 15000 });
    await expect(items).toHaveLength(3);
  },
};

export const NoWorkspacesYet: Story = {
  decorators: navTreeDecorators({ spaces: 'none' }),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('treeView.userAccount.pending', {}, { timeout: 15000 });
    await expect(canvas.queryAllByTestId(/^spacePlugin\.space/)).toHaveLength(0);
  },
};
