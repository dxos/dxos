//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { Form } from '@dxos/react-ui-form';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';
import { AgentEmail } from '#types';

export type EmailChannelSettingsProps = {
  /** Scopes the toolbar to the host plank's attention; without one it is always enabled. */
  attendableId?: string;
  values?: Partial<AgentEmail.Properties>;
  /** Undefined until the first status arrives. */
  status?: ThreadOperation.ConnectionStatus;
  /** A failure to reach the mailbox, as distinct from the mailbox's own `status.error`. */
  error?: string;
  busy?: boolean;
  onSave?: (values: AgentEmail.Properties) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

/** An email channel's address and sender allowlist, its connect/disconnect toolbar and the mailbox status. */
export const EmailChannelSettings = ({
  attendableId,
  values,
  status,
  error,
  busy = false,
  onSave,
  onConnect,
  onDisconnect,
}: EmailChannelSettingsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const running = status?.running ?? false;
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['email-mailbox-actions.label', { ns: meta.profile.key }] })
        // The panel's name leads and takes the free space, which keeps the actions at the end.
        .text('title', { label: ['email-mailbox.title', { ns: meta.profile.key }] })
        // One toggle, as Activity's: connect while stopped, disconnect while running; reconnecting applies edits.
        .action(
          running ? 'disconnect' : 'connect',
          {
            label: [
              running ? 'email-mailbox-disconnect.label' : 'email-mailbox-connect.label',
              { ns: meta.profile.key },
            ],
            icon: running ? 'ph--plugs-connected--regular' : 'ph--plugs--regular',
            disabled: busy,
          },
          () => (running ? onDisconnect : onConnect)?.(),
        )
        .build(),
    [running, busy, onConnect, onDisconnect],
  );

  // A panel of its own, its toolbar the header, so a host without a header shows it as the other panels' top bar.
  return (
    <Panel.Root data-testid='email-channel'>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />
      </Panel.Header>
      <Form.Root<AgentEmail.Properties> schema={AgentEmail.Properties} values={values} autoSave onSave={onSave}>
        <Panel.Body asChild>
          <Form.Viewport scroll>
            <Form.Content>
              <Form.FieldSet label={t('email-channel.label')} description={t('email-channel.description')}>
                <Form.Fields />
              </Form.FieldSet>
              <MailboxBanner status={status} error={error} />
            </Form.Content>
          </Form.Viewport>
        </Panel.Body>
      </Form.Root>
    </Panel.Root>
  );
};

EmailChannelSettings.displayName = 'EmailChannelSettings';

const MailboxBanner = ({ status, error }: Pick<EmailChannelSettingsProps, 'status' | 'error'>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const message = error ?? status?.error;
  if (message) {
    return (
      <Banner.Root valence='error'>
        <Banner.Title>{t('email-mailbox-error.label')}</Banner.Title>
        <Banner.Body>{message}</Banner.Body>
      </Banner.Root>
    );
  }
  if (!status) {
    return null;
  }
  return (
    <Banner.Root valence={status.running ? 'success' : 'neutral'}>
      <Banner.Title>
        {t(status.running ? 'email-mailbox-connected.label' : 'email-mailbox-disconnected.label')}
      </Banner.Title>
      {status.detail && <Banner.Body>{status.detail}</Banner.Body>}
    </Banner.Root>
  );
};

export type EmailChannelCreateProps = {
  values?: Partial<AgentEmail.Properties>;
  onCreate?: (values: AgentEmail.Properties) => void;
};

/** The form that gives an agent its address; saving creates the email channel, which is then connected separately. */
export const EmailChannelCreate = ({ values, onCreate }: EmailChannelCreateProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Form.Root<AgentEmail.Properties> schema={AgentEmail.Properties} values={values} onSave={onCreate}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet label={t('email-channel.label')} description={t('email-channel-create.description')}>
            <Form.Fields />
          </Form.FieldSet>
          <Form.Actions />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

EmailChannelCreate.displayName = 'EmailChannelCreate';
