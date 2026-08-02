//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useMemo, useState } from 'react';

import { random } from '@dxos/random';

import {
  Avatar,
  Button,
  Card,
  Dialog,
  DropdownMenu,
  Icon,
  IconButton,
  Input,
  Main,
  Message,
  Panel,
  Popover,
  ScrollArea,
  Select,
  Separator,
  Status,
  Tag,
  Toolbar,
  useSidebars,
} from '../components';
import { withLayout, withTheme } from '../testing';

random.seed(1);

/**
 * Kitchen-sink app frame built only from `@dxos/react-ui` primitives at their default props, so
 * every surface shown is the one the app actually paints. Doubles as the review harness for the
 * elevation ladder: `Proposed` re-points the named surface tokens per AUDIT.md decision D1 (chrome
 * below the canvas, cards above it) without touching any component.
 */

// The `--dx-elevation-*` knobs cannot be overridden from a descendant scope — substitution into the
// named tokens already ran at `:root` — so the preview redefines the named tokens on the root.
const chromeSurface = 'light-dark(var(--color-neutral-250), var(--color-neutral-925))';

const proposedLadder: Record<string, string> = {
  '--color-card-surface': 'light-dark(var(--color-neutral-125), var(--color-neutral-850))',
  '--color-sidebar-surface': chromeSurface,
  '--color-header-surface': chromeSurface,
  '--color-l0-surface': chromeSurface,
  '--color-l1-surface': chromeSurface,
  '--color-r0-surface': chromeSurface,
  '--color-r1-surface': chromeSurface,
  '--color-toolbar-surface': 'light-dark(var(--color-neutral-100), var(--color-neutral-825))',
};

// The override is document-wide, so it is reference-counted and restores whatever was on the root
// beforehand: in docs mode both stories mount at once, and an unguarded cleanup would strip the
// tokens out from under the story still showing them.
let ladderUsers = 0;
let restoreLadder: Record<string, string> | undefined;

const useProposedLadder = (enabled?: boolean) => {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const { style } = document.documentElement;
    if (ladderUsers++ === 0) {
      restoreLadder = Object.fromEntries(
        Object.keys(proposedLadder).map((token) => [token, style.getPropertyValue(token)]),
      );
      Object.entries(proposedLadder).forEach(([token, value]) => style.setProperty(token, value));
    }

    return () => {
      if (--ladderUsers === 0) {
        Object.entries(restoreLadder ?? {}).forEach(([token, value]) =>
          value ? style.setProperty(token, value) : style.removeProperty(token),
        );
        restoreLadder = undefined;
      }
    };
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

const ContactCard = () => (
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
        <Card.Text>
          <Tag hue='blue'>design</Tag> <Tag hue='emerald'>theme</Tag>
        </Card.Text>
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
          <Avatar.Content fallback='DX' size={6} variant='circle' />
        </Avatar.Root>
      </Card.Block>
      <Card.Title>Avatar, message, status</Card.Title>
    </Card.Header>
    <Card.Body>
      <Card.Row fullWidth>
        <Message.Root valence='warning'>
          <Message.Title>Message.Root</Message.Title>
          <Message.Content>A valence surface nested inside a card.</Message.Content>
        </Message.Root>
      </Card.Row>
      <Card.Row fullWidth>
        <Status progress={0.6} />
      </Card.Row>
      <Card.Row fullWidth>
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

const CompanionCard = ({ index }: { index: number }) => {
  const text = useMemo(() => random.lorem.paragraph(), []);
  return (
    <Card.Root fullWidth>
      <Card.Header>
        <Card.Block>
          <Avatar.Root>
            <Avatar.Content fallback={`${index}`} size={6} variant='circle' />
          </Avatar.Root>
        </Card.Block>
        <Card.Title>{`Companion card ${index}`}</Card.Title>
        <Card.Menu items={[{ label: 'Dismiss', icon: 'ph--x--regular', onClick: () => {} }]} />
      </Card.Header>
      <Card.Body>
        <Card.Row>
          <Card.Text variant='description'>{text}</Card.Text>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};

const SettingsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
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
          <ContactCard />
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

const AppFrame = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
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

      <Main.Content classNames='w-full'>
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
                      <DropdownMenu.Item onSelect={() => setDialogOpen(true)}>
                        <Icon icon='ph--gear--regular' />
                        Open dialog
                      </DropdownMenu.Item>
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
                <ContactCard />
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
            <ScrollArea.Root centered padding>
              <ScrollArea.Viewport className='flex flex-col items-center py-3 gap-3'>
                {Array.from({ length: 20 }, (_, index) => (
                  <CompanionCard key={index} index={index + 1} />
                ))}
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Content>
        </Panel.Root>
      </Main.ComplementarySidebar>

      <SettingsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Main.Root>
  );
};

type StoryProps = { proposed?: boolean };

const DefaultStory = ({ proposed }: StoryProps) => {
  useProposedLadder(proposed);
  return <AppFrame />;
};

const meta = {
  title: 'ui/react-ui-core/playground/Elevation',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Current: Story = {
  args: { proposed: false },
};

export const Proposed: Story = {
  args: { proposed: true },
};
