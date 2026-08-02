//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect } from 'react';

import { Avatar } from '../components/Avatars';
import { Button, IconButton } from '../components/Button';
import { Card } from '../components/Card';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { Input } from '../components/Input';
import { Main, useSidebars } from '../components/Main';
import { DropdownMenu } from '../components/Menu';
import { Message } from '../components/Message';
import { Panel } from '../components/Panel';
import { Popover } from '../components/Popover';
import { ScrollArea } from '../components/ScrollArea';
import { Select } from '../components/Select';
import { Separator } from '../components/Separator';
import { Status } from '../components/Status';
import { Tag } from '../components/Tag';
import { Toolbar } from '../components/Toolbar';
import { withLayout, withTheme } from '../testing';

/**
 * Kitchen-sink app frame built only from `@dxos/react-ui` primitives at their default props, so
 * every surface shown is the one the app actually paints. Doubles as the review harness for the
 * elevation ladder: the `Proposed` stories re-point the named surface tokens per AUDIT.md decision
 * D1 (chrome below the canvas, cards above it) without touching any component.
 */

// The `--dx-elevation-*` knobs cannot be overridden from a descendant scope — substitution into the
// named tokens already ran at `:root` — so the preview redefines the named tokens on the root.
const proposedLadder: Record<string, string> = {
  '--color-card-surface': 'light-dark(var(--color-neutral-125), var(--color-neutral-850))',
  '--color-sidebar-surface': 'light-dark(var(--color-neutral-250), var(--color-neutral-925))',
  '--color-header-surface': 'light-dark(var(--color-neutral-250), var(--color-neutral-925))',
  '--color-l0-surface': 'light-dark(var(--color-neutral-250), var(--color-neutral-925))',
  '--color-l1-surface': 'light-dark(var(--color-neutral-250), var(--color-neutral-925))',
  '--color-r0-surface': 'light-dark(var(--color-neutral-250), var(--color-neutral-925))',
  '--color-r1-surface': 'light-dark(var(--color-neutral-250), var(--color-neutral-925))',
  '--color-toolbar-surface': 'light-dark(var(--color-neutral-100), var(--color-neutral-825))',
};

const useProposedLadder = (enabled?: boolean) => {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    const { style } = document.documentElement;
    Object.entries(proposedLadder).forEach(([token, value]) => style.setProperty(token, value));
    return () => Object.keys(proposedLadder).forEach((token) => style.removeProperty(token));
  }, [enabled]);
};

const NavigationToggle = ({ close }: { close?: boolean }) => {
  const { toggleNavigationSidebar } = useSidebars('StoryElevation__NavigationToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-left--regular' : 'ph--sidebar-simple--regular'}
      iconOnly
      label='Toggle navigation sidebar'
      onClick={toggleNavigationSidebar}
    />
  );
};

const ComplementaryToggle = ({ close }: { close?: boolean }) => {
  const { toggleComplementarySidebar } = useSidebars('StoryElevation__ComplementaryToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-right--regular' : 'ph--sidebar-simple--regular'}
      iconOnly
      label='Toggle complementary sidebar'
      onClick={toggleComplementarySidebar}
    />
  );
};

const NavigationCard = () => (
  <Card.Root>
    <Card.Header>
      <Card.Block>
        <Icon icon='ph--folder--regular' />
      </Card.Block>
      <Card.Title>Workspace</Card.Title>
      <Card.Menu items={[{ label: 'Rename', icon: 'ph--pencil--regular', onClick: () => {} }]} />
    </Card.Header>
    <Card.Body>
      <Card.Action icon='ph--article--regular' label='Documents' annotation='12' onClick={() => {}} />
      <Card.Action icon='ph--table--regular' label='Tables' annotation='3' onClick={() => {}} />
      <Card.Action icon='ph--chats-circle--regular' label='Threads' annotation='8' onClick={() => {}} />
      <Card.Link label='dxos.org' href='https://dxos.org' />
    </Card.Body>
  </Card.Root>
);

const ContentCard = () => (
  <Card.Root>
    <Card.Header>
      <Card.DragHandle />
      <Card.Title>Card on the canvas</Card.Title>
      <Card.ActionIconButton action='close' onClick={() => {}} />
    </Card.Header>
    <Card.Body>
      <Card.Row>
        <Card.Block>
          <Icon icon='ph--user--regular' />
        </Card.Block>
        <Card.Text>Card.Text sitting in the content track.</Card.Text>
      </Card.Row>
      <Card.Row>
        <Card.Block>
          <Icon icon='ph--tag--regular' />
        </Card.Block>
        <Tag hue='blue'>tag</Tag>
      </Card.Row>
      <Card.Section title='Inputs'>
        <Input.Root>
          <Input.Label>Text</Input.Label>
          <Input.TextInput placeholder='Input.TextInput' />
        </Input.Root>
        <Input.Root>
          <Input.Label>Switch</Input.Label>
          <Input.Switch />
        </Input.Root>
        <Input.Root>
          <Input.Label>Checkbox</Input.Label>
          <Input.Checkbox />
        </Input.Root>
      </Card.Section>
      <Card.Row>
        <Card.Text variant='description'>Card.Text with the description variant.</Card.Text>
      </Card.Row>
    </Card.Body>
  </Card.Root>
);

const MessageCard = () => (
  <Card.Root>
    <Card.Header>
      <Card.Block>
        <Avatar.Root>
          <Avatar.Content fallback='DX' />
        </Avatar.Root>
      </Card.Block>
      <Card.Title>Avatar, message, status</Card.Title>
    </Card.Header>
    <Card.Body>
      <Card.Row>
        <Message.Root valence='warning'>
          <Message.Title>Message.Root</Message.Title>
          <Message.Content>A valence surface nested inside a card.</Message.Content>
        </Message.Root>
      </Card.Row>
      <Card.Row>
        <Status progress={0.6} />
      </Card.Row>
      <Card.Row>
        <Separator />
      </Card.Row>
      <Card.Row>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button>Open popover</Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content>
              <Popover.Viewport>
                <Input.Root>
                  <Input.Label>Popover surface</Input.Label>
                  <Input.TextInput placeholder='Input inside a popover' />
                </Input.Root>
              </Popover.Viewport>
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </Card.Row>
    </Card.Body>
  </Card.Root>
);

const AppFrame = () => (
  <Main.Root defaultNavigationSidebarState='expanded' defaultComplementarySidebarState='expanded'>
    <Main.Overlay />

    <Main.NavigationSidebar label='Navigation'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.Text>Navigation</Toolbar.Text>
            <Toolbar.Separator />
            <NavigationToggle close />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <NavigationCard />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    </Main.NavigationSidebar>

    <Main.Content>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <NavigationToggle />
            <Toolbar.Separator />
            <Toolbar.IconButton icon='ph--plus--regular' variant='primary' label='Add' />
            <Input.Root>
              <Input.TextInput placeholder='Search' />
            </Input.Root>
            <Select.Root defaultValue='all'>
              <Select.TriggerButton placeholder='Filter' />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    <Select.Option value='all'>All</Select.Option>
                    <Select.Option value='mine'>Mine</Select.Option>
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content>
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item>
                      <Icon icon='ph--copy--regular' />
                      Duplicate
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                      <Icon icon='ph--trash--regular' />
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <Toolbar.Separator />
            <ComplementaryToggle />
          </Toolbar.Root>
        </Panel.Toolbar>

        <Panel.Content asChild>
          <ScrollArea.Root centered>
            <ScrollArea.Viewport>
              <ContentCard />
              <MessageCard />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>

        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Home' />
            <Toolbar.Separator />
            <Toolbar.Text>Statusbar</Toolbar.Text>
            <Toolbar.Separator />
            <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' />
          </Toolbar.Root>
        </Panel.Statusbar>
      </Panel.Root>
    </Main.Content>

    <Main.ComplementarySidebar label='Complementary'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <ComplementaryToggle close />
            <Toolbar.Separator />
            <Toolbar.Text>Companion</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <NavigationCard />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    </Main.ComplementarySidebar>
  </Main.Root>
);

const DialogFrame = () => (
  <Dialog.Root defaultOpen modal>
    <Dialog.Overlay>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Dialog on the modal surface</Dialog.Title>
          <Dialog.Close asChild>
            <Dialog.ActionIconButton action='close' />
          </Dialog.Close>
        </Dialog.Header>
        <Dialog.Body>
          <Dialog.Description>Nested surfaces inside a dialog: card, input, popover.</Dialog.Description>
          <ContentCard />
        </Dialog.Body>
        <Dialog.ActionBar>
          <Dialog.Close asChild>
            <Button variant='primary'>Done</Button>
          </Dialog.Close>
        </Dialog.ActionBar>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Root>
);

type StoryProps = { proposed?: boolean };

const AppStory = ({ proposed }: StoryProps) => {
  useProposedLadder(proposed);
  return <AppFrame />;
};

const DialogStory = ({ proposed }: StoryProps) => {
  useProposedLadder(proposed);
  return (
    <>
      <AppFrame />
      <DialogFrame />
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/playground/Elevation',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<StoryProps>;

export const Current: Story = {
  render: AppStory,
  args: { proposed: false },
};

export const Proposed: Story = {
  render: AppStory,
  args: { proposed: true },
};

export const CurrentWithDialog: Story = {
  render: DialogStory,
  args: { proposed: false },
};

export const ProposedWithDialog: Story = {
  render: DialogStory,
  args: { proposed: true },
};
