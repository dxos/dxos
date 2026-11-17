//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as Panel from '@dxos/react-ui/Panel';
import * as Popover from '@dxos/react-ui/Popover';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Status from '@dxos/react-ui/Status';
import * as Toast from '@dxos/react-ui/Toast';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Typography from '@dxos/react-ui/Typography';

// #region buttons
export const Buttons = () => (
  <Layout.Flex gap='sm' wrap>
    <Button.Root variant='primary'>Save</Button.Root>
    <Button.Root>Cancel</Button.Root>
    <Button.Root variant='ghost' icon='ph--plus--regular' label='Add' />
    <Button.Root
      variant='destructive'
      icon='ph--trash--regular'
      label='Delete'
      iconOnly
    />
    <Button.Toggle
      icon='ph--star--regular'
      activeIcon='ph--star--fill'
      label='Favorite'
      iconOnly
    />
  </Layout.Flex>
);
// #endregion

const ROLES: Select.Option[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

// #region inputs
export const Inputs = () => (
  <Layout.Flex column gap='form'>
    <Field.Root>
      <Field.Label>Name</Field.Label>
      <Input.Root placeholder='Ada Lovelace' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Email</Field.Label>
      <Input.Root
        type='email'
        start={<Icon.Icon icon='ph--envelope--regular' />}
      />
    </Field.Root>
    <Field.Root>
      <Field.Label>Role</Field.Label>
      <Select.Root items={ROLES}>
        <Select.Trigger placeholder='Choose a role' />
        <Select.Content>
          {ROLES.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
    <Input.Checkbox label='Send an invitation' defaultChecked />
    <Input.Switch label='Notifications' />
  </Layout.Flex>
);
// #endregion

const CONTACTS = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Katherine Johnson',
  'Edsger Dijkstra',
];

// #region panel
export const ContactsPanel = () => (
  <Panel.Root>
    <Panel.Header>
      <Toolbar.Root>
        <Toolbar.Text>Contacts</Toolbar.Text>
        <Toolbar.Separator variant='gap' />
        <Button.Root icon='ph--plus--regular' label='Add contact' iconOnly />
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root>
        <ScrollArea.Viewport asChild>
          <Layout.Container gutter='rail'>
            {CONTACTS.map((name) => (
              <Layout.Container key={name} layout='row'>
                <Layout.Block rail='start'>
                  <Icon.Icon icon='ph--user--regular' />
                </Layout.Block>
                <Typography.Text>{name}</Typography.Text>
              </Layout.Container>
            ))}
          </Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
    <Panel.Footer>
      <Toolbar.Root>
        <Toolbar.Text>{CONTACTS.length} contacts</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Footer>
  </Panel.Root>
);
// #endregion

// #region dialog
export const EditDialog = () => (
  <Dialog.Root>
    <Dialog.Trigger asChild>
      <Button.Root>Edit contact</Button.Root>
    </Dialog.Trigger>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Edit contact</Dialog.Title>
        <Dialog.CloseTrigger />
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description>
          Changes are saved when you press Save.
        </Dialog.Description>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input.Root defaultValue='Ada Lovelace' />
        </Field.Root>
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.CloseTrigger asChild>
          <Button.Root>Cancel</Button.Root>
        </Dialog.CloseTrigger>
        <Dialog.CloseTrigger asChild>
          <Button.Root variant='primary'>Save</Button.Root>
        </Dialog.CloseTrigger>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
);
// #endregion

// #region popover
export const SharePopover = () => (
  <Popover.Root>
    <Popover.Trigger asChild>
      <Button.Root icon='ph--share-network--regular' label='Share' />
    </Popover.Trigger>
    <Popover.Content>
      <Popover.Header>
        <Popover.Title>Share contact</Popover.Title>
        <Popover.CloseTrigger />
      </Popover.Header>
      <Popover.Description>Anyone with the link can view.</Popover.Description>
      <Input.Root
        defaultValue='https://example.com/c/ada'
        readOnly
        copyable
        aria-label='Link'
      />
    </Popover.Content>
  </Popover.Root>
);
// #endregion

// #region tooltip
export const SaveTooltip = () => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <Button.Root>Save</Button.Root>
    </Tooltip.Trigger>
    <Tooltip.Content>Save changes (⌘S)</Tooltip.Content>
  </Tooltip.Root>
);
// #endregion

// #region toast
export const SavedToast = () => {
  const [open, setOpen] = useState(false);
  return (
    <Toast.Provider>
      <Button.Root onClick={() => setOpen(true)}>Save</Button.Root>
      <Toast.Root open={open} onOpenChange={setOpen}>
        <Toast.Header icon='ph--check-circle--regular'>
          Contact saved
        </Toast.Header>
        <Toast.Description>Ada Lovelace was updated.</Toast.Description>
      </Toast.Root>
      <Toast.Toaster />
    </Toast.Provider>
  );
};
// #endregion

// #region menu
export const ContactMenu = () => {
  const [selected, setSelected] = useState<string>();
  return (
    <Layout.Flex gap='sm' align='center'>
      <Menu.Root onSelect={({ value }) => setSelected(value)}>
        <Menu.Trigger asChild>
          <Button.Root caretDown>Actions</Button.Root>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item
            item={{
              value: 'edit',
              label: 'Edit',
              icon: 'ph--pencil-simple--regular',
            }}
          />
          <Menu.Item
            item={{
              value: 'duplicate',
              label: 'Duplicate',
              icon: 'ph--copy--regular',
              shortcut: '⌘D',
            }}
          />
          <Menu.Separator />
          <Menu.Item
            item={{
              value: 'delete',
              label: 'Delete',
              icon: 'ph--trash--regular',
            }}
          />
        </Menu.Content>
      </Menu.Root>
      <Typography.Text>
        {selected ? `Chose ${selected}` : 'Nothing chosen'}
      </Typography.Text>
    </Layout.Flex>
  );
};
// #endregion

// #region status
export const States = () => (
  <Layout.Flex column gap='md'>
    <Status.Progress value={0.6} label='Importing contacts' />
    <Status.Progress indeterminate label='Syncing' />
    <Status.Skeleton variant='text' />
    <Status.Empty icon='ph--address-book--regular'>
      No contacts yet
    </Status.Empty>
  </Layout.Flex>
);
// #endregion

// #region icons
export const Icons = () => (
  <Layout.Flex gap='md' align='center'>
    <Icon.Icon icon='ph--house--regular' size='lg' />
    <Icon.Icon icon='ph--heart--fill' size='lg' hue='red' />
    <Icon.Icon icon='ph--warning--regular' size='lg' valence='warning' />
    <Icon.Icon icon='ph--spinner--regular' size='lg' spin />
  </Layout.Flex>
);
// #endregion

// #region sizes
export const Sizes = () => (
  <Layout.Flex column gap='sm'>
    {(['sm', 'md', 'lg'] as const).map((size) => (
      <Toolbar.Root key={size} size={size}>
        <Button.Root icon='ph--plus--regular' label='Add' iconOnly />
        <Input.Root placeholder={`Search (${size})`} aria-label='Search' />
        <Button.Root>Save</Button.Root>
      </Toolbar.Root>
    ))}
  </Layout.Flex>
);
// #endregion
