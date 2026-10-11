//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';

//
// Root
//

type DiscordSetupRootProps = PropsWithChildren<{ role?: string; error?: string }>;

/** Setting up an agent on Discord: the user's account, the servers, and the channels routed to the agent. */
const DiscordSetupRoot = ({ role, error, children }: DiscordSetupRootProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Panel.Root role={role} data-testid='discord-setup'>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport asChild>
            {/* A wider gap between sections than within one, so each heading reads with its own list. */}
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
// Section
//

type DiscordSetupSectionProps = PropsWithChildren<{ title: string; description?: string }>;

const DiscordSetupSection = ({ title, description, children }: DiscordSetupSectionProps) => (
  <Layout.Flex asChild column gap='xs'>
    <section aria-label={title}>
      <h3 className='text-sm text-fg-muted'>{title}</h3>
      {description && <Typography.Text tone='muted'>{description}</Typography.Text>}
      {children}
    </section>
  </Layout.Flex>
);

DiscordSetupSection.displayName = 'DiscordSetup.Section';

//
// Account
//

type DiscordSetupAccountProps = { account?: string; busy?: boolean; onConnect?: () => void };

/** The signed-in Discord user, or the button that signs them in. */
const DiscordSetupAccount = ({ account, busy, onConnect }: DiscordSetupAccountProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <DiscordSetupSection title={t('discord-setup-account.label')} description={t('discord-setup-account.description')}>
      {account ? (
        <Typography.Text data-testid='discord-setup-account'>{account}</Typography.Text>
      ) : (
        <Button.Root
          icon='ph--discord-logo--regular'
          label={t('discord-setup-connect.label')}
          disabled={busy}
          onClick={onConnect}
          data-testid='discord-setup-connect'
        />
      )}
    </DiscordSetupSection>
  );
};

DiscordSetupAccount.displayName = 'DiscordSetup.Account';

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
    <Listbox.Content scroll={false}>{children}</Listbox.Content>
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
  <Listbox.Item id={id} data-testid={`discord-setup-item-${id}`}>
    <Listbox.ItemIcon icon={icon} />
    <Listbox.ItemText>{label}</Listbox.ItemText>
    {detail && <Listbox.ItemDescription>{detail}</Listbox.ItemDescription>}
    {children}
  </Listbox.Item>
);

DiscordSetupItem.displayName = 'DiscordSetup.Item';

export const DiscordSetup = {
  Root: DiscordSetupRoot,
  Section: DiscordSetupSection,
  Account: DiscordSetupAccount,
  List: DiscordSetupList,
  Item: DiscordSetupItem,
};
