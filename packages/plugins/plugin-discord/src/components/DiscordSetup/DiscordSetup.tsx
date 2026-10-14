//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { meta } from '#meta';

//
// Root
//

type DiscordSetupRootProps = PropsWithChildren<{ role?: string; error?: string; toolbar?: ReactNode }>;

/** Setting up an agent on Discord: the servers, and the channels routed to the agent. */
const DiscordSetupRoot = ({ role, error, toolbar, children }: DiscordSetupRootProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Panel.Root role={role} data-testid='discord-setup'>
      {toolbar && <Panel.Header>{toolbar}</Panel.Header>}
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport asChild>
            <Layout.Container gap='lg'>
              {error && (
                <Banner.Root valence='error'>
                  <Banner.Title>{t('discord-setup-error.label')}</Banner.Title>
                  <Banner.Body>{error}</Banner.Body>
                </Banner.Root>
              )}
              {children}
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

DiscordSetupRoot.displayName = 'DiscordSetup.Root';

//
// Toolbar
//

type DiscordSetupToolbarProps = {
  attendableId?: string;
  /** Whether the user is signed in to Discord. */
  signedIn?: boolean;
  busy?: boolean;
  onConnect?: () => void;
  onSignOut?: () => void;
  onRefresh?: () => void;
};

/** Signs the user in to (or out of) Discord, and re-reads the servers. */
const DiscordSetupToolbar = ({
  attendableId,
  signedIn = false,
  busy = false,
  onConnect,
  onSignOut,
  onRefresh,
}: DiscordSetupToolbarProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['discord-setup-actions.label', { ns: meta.profile.key }] })
        .action(
          'refresh',
          {
            label: ['discord-setup-refresh.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-counter-clockwise--regular',
            disabled: busy,
          },
          () => onRefresh?.(),
        )
        .action(
          signedIn ? 'sign-out' : 'connect',
          {
            label: [
              signedIn ? 'discord-setup-sign-out.label' : 'discord-setup-connect.label',
              { ns: meta.profile.key },
            ],
            icon: signedIn ? 'ph--sign-out--regular' : 'ph--discord-logo--regular',
            disabled: busy,
          },
          () => (signedIn ? onSignOut : onConnect)?.(),
        )
        .build(),
    [signedIn, busy, onConnect, onSignOut, onRefresh],
  );

  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <ActionToolbar
      {...menuActions}
      attendableId={attendableId}
      alwaysActive={attendableId === undefined}
      // The panel's name leads and takes the free space, which keeps the actions at the end.
      start={
        <>
          <Toolbar.Text>{t('discord-setup.title')}</Toolbar.Text>
        </>
      }
    />
  );
};

DiscordSetupToolbar.displayName = 'DiscordSetup.Toolbar';

//
// List
//

type DiscordSetupListProps = PropsWithChildren<{
  /** The ids of the rows, in order. */
  ids: readonly string[];
  /** The selected row, for a list the user picks from; omitted for a list of actions only. */
  value?: string;
  onValueChange?: (id: string) => void;
}>;

/** Servers or channels as one list; children are {@link DiscordSetupItem} rows. */
const DiscordSetupList = ({ ids, value, onValueChange, children }: DiscordSetupListProps) => (
  <Listbox.Root
    items={ids.map((id) => ({ value: id, label: id }))}
    {...(onValueChange ? { value, onValueChange } : {})}
  >
    <Listbox.Content>{children}</Listbox.Content>
  </Listbox.Root>
);

DiscordSetupList.displayName = 'DiscordSetup.List';

//
// Item
//

type DiscordSetupItemProps = PropsWithChildren<{
  id: string;
  icon: string;
  label: string;
  /** The row's state, e.g. "Installed" or the agent a channel is routed to. */
  detail?: string;
}>;

/** One server or channel: its name, its state, and (as children) its action. */
const DiscordSetupItem = ({ id, icon, label, detail, children }: DiscordSetupItemProps) => (
  <Listbox.Item id={id} classNames='dx-hover' data-testid={`discord-setup-item-${id}`}>
    <Listbox.ItemIcon icon={icon} />
    <Listbox.ItemText>{label}</Listbox.ItemText>
    {detail && <Listbox.ItemDescription>{detail}</Listbox.ItemDescription>}
    {children}
  </Listbox.Item>
);

DiscordSetupItem.displayName = 'DiscordSetup.Item';

export const DiscordSetup = {
  Root: DiscordSetupRoot,
  Toolbar: DiscordSetupToolbar,
  List: DiscordSetupList,
  Item: DiscordSetupItem,
};
