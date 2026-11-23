//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { DiscordNamespace } from '../../namespace.ts';

//
// Root
//

type DiscordSetupRootProps = PropsWithChildren<{ role?: string; error?: string; toolbar?: ReactNode }>;

/** Setting up an agent on Discord: the servers, and the channels routed to the agent. */
const DiscordSetupRoot = ({ role, error, toolbar, children }: DiscordSetupRootProps) => {
  const { t } = Hooks.useTranslation(DiscordNamespace.key);
  return (
    <Panel.Root role={role} data-testid='discord-setup'>
      {toolbar && <Panel.Header>{toolbar}</Panel.Header>}
      {/* The form's frame and field spacing, so its sections read as the forms around it do. */}
      <Panel.Body asChild>
        <Form.Viewport scroll>
          <Layout.Container gutter='inherit' gap='sm'>
            {error && (
              <Banner.Root valence='error'>
                <Banner.Title>{t('discord-setup-error.label')}</Banner.Title>
                <Banner.Body>{error}</Banner.Body>
              </Banner.Root>
            )}
            {children}
          </Layout.Container>
        </Form.Viewport>
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
  /** The hub console's page for the bots on this EDGE; its action opens it in a new tab. */
  consoleUrl?: string;
};

/** Signs the user in to (or out of) Discord, and re-reads the servers. */
const DiscordSetupToolbar = ({
  attendableId,
  signedIn = false,
  busy = false,
  onConnect,
  onSignOut,
  onRefresh,
  consoleUrl,
}: DiscordSetupToolbarProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['discord-setup-actions.label', { ns: DiscordNamespace.key }] })
        // The panel's name leads and takes the free space, which keeps the actions at the end.
        .text('title', { label: ['discord-setup.title', { ns: DiscordNamespace.key }] })
        .action(
          'refresh',
          {
            label: ['discord-setup-refresh.label', { ns: DiscordNamespace.key }],
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
              { ns: DiscordNamespace.key },
            ],
            icon: signedIn ? 'ph--sign-out--regular' : 'ph--discord-logo--regular',
            disabled: busy,
          },
          () => (signedIn ? onSignOut : onConnect)?.(),
        )
        .subgraph(
          consoleUrl !== undefined &&
            ((builder) =>
              builder.action(
                'console',
                {
                  label: ['discord-setup-console.label', { ns: DiscordNamespace.key }],
                  icon: 'ph--arrow-square-out--regular',
                },
                () => window.open(consoleUrl, '_blank', 'noopener,noreferrer'),
              )),
        )
        .build(),
    [signedIn, busy, onConnect, onSignOut, onRefresh, consoleUrl],
  );

  return <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />;
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
