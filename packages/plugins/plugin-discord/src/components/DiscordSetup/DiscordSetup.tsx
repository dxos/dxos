//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

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
            <Layout.Container>
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
  <Layout.Flex asChild column gap='sm'>
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
// Row
//

type DiscordSetupRowProps = PropsWithChildren<{
  label: string;
  detail?: string;
  testId?: string;
  selected?: boolean;
  onSelect?: () => void;
}>;

/** One server or channel: its name, its state, and its action. */
const DiscordSetupRow = ({ label, detail, testId, selected, onSelect, children }: DiscordSetupRowProps) => (
  <Layout.Flex gap='sm' classNames='items-center' data-testid={testId} data-selected={selected || undefined}>
    {onSelect ? (
      <Button.Root
        variant={selected ? 'primary' : 'ghost'}
        label={label}
        onClick={onSelect}
        classNames='grow justify-start'
      />
    ) : (
      <Typography.Text classNames='grow truncate'>{label}</Typography.Text>
    )}
    {detail && <Typography.Text tone='muted'>{detail}</Typography.Text>}
    {children}
  </Layout.Flex>
);

DiscordSetupRow.displayName = 'DiscordSetup.Row';

export const DiscordSetup = {
  Root: DiscordSetupRoot,
  Section: DiscordSetupSection,
  Account: DiscordSetupAccount,
  Row: DiscordSetupRow,
};
