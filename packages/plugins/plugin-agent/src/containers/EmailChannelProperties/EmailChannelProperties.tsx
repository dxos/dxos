//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { type SpaceId } from '@dxos/keys';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { useInterval } from '@dxos/react-hooks';
import { Form } from '@dxos/react-ui-form';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import { type Channel } from '@dxos/types';

import { meta } from '#meta';
import { AgentEmail } from '#types';

/** How often the mailbox status is re-read; mail arrives on EDGE without notifying Composer. */
const STATUS_POLL_MS = 10_000;

export type EmailChannelPropertiesProps = AppSurface.ObjectPropertiesProps<Channel.Channel> & {
  attendableId?: string;
};

/**
 * The address and sender allowlist of an email-backed channel, with the mailbox's EDGE status. Edits apply to EDGE
 * when the channel is (re)connected, since the mailbox there holds its own copy of the config.
 */
export const EmailChannelProperties = ({ subject: channel, attendableId }: EmailChannelPropertiesProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const db = Obj.getDatabase(channel);
  const config = useResolveRef(channel.backend.config);
  const email = AgentEmail.instanceOf(config) ? config : undefined;
  const [values] = useObject(email);
  const mailbox = useConnection(channel, db?.spaceId);

  const handleSave = useCallback(
    (properties: AgentEmail.Properties) => {
      if (email) {
        Obj.update(email, (email) => {
          email.handle = properties.handle.trim().toLowerCase();
          email.displayName = properties.displayName;
          email.allowedSenders = [...properties.allowedSenders];
        });
      }
    },
    [email],
  );

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['email-mailbox-actions.label', { ns: meta.profile.key }] })
        .action(
          'connect',
          {
            // Reconnecting pushes edited settings to EDGE, so the label follows the state.
            label: [
              mailbox.status?.running ? 'email-mailbox-update.label' : 'email-mailbox-connect.label',
              { ns: meta.profile.key },
            ],
            icon: mailbox.status?.running ? 'ph--arrow-clockwise--regular' : 'ph--play--regular',
            disabled: mailbox.busy,
          },
          () => mailbox.connect(),
        )
        .action(
          'disconnect',
          {
            label: ['email-mailbox-disconnect.label', { ns: meta.profile.key }],
            icon: 'ph--stop--regular',
            disabled: mailbox.busy || !mailbox.status?.running,
          },
          () => mailbox.disconnect(),
        )
        .build(),
    [mailbox.status?.running, mailbox.busy, mailbox.connect, mailbox.disconnect],
  );

  if (!email) {
    return null;
  }

  return (
    <Layout.Flex column>
      <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />
      <Form.Root<AgentEmail.Properties>
        schema={AgentEmail.Properties}
        db={db}
        values={values}
        autoSave
        onSave={handleSave}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet label={t('email-channel.label')} description={t('email-channel.description')}>
              <Form.Fields />
            </Form.FieldSet>
            <MailboxBanner status={mailbox.status} error={mailbox.error} />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Layout.Flex>
  );
};

EmailChannelProperties.displayName = 'EmailChannelProperties';

const MailboxBanner = ({ status, error }: { status?: ThreadOperation.ConnectionStatus; error?: string }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  if (error || status?.error) {
    return (
      <Banner.Root valence='error'>
        <Banner.Title>{t('email-mailbox-error.label')}</Banner.Title>
        <Banner.Body>{error ?? status?.error}</Banner.Body>
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

/** Connect/disconnect for the channel's mailbox, polling its status while mounted. */
const useConnection = (channel: Channel.Channel, spaceId: SpaceId | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [status, setStatus] = useState<ThreadOperation.ConnectionStatus>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (
      operation:
        | typeof ThreadOperation.ConnectChannel
        | typeof ThreadOperation.DisconnectChannel
        | typeof ThreadOperation.GetChannelStatus,
    ) => {
      if (!spaceId) {
        return;
      }
      const { data, error } = await invokePromise(operation, { channel: Ref.make(channel) }, { spaceId });
      setError(error?.message);
      if (data) {
        setStatus(data.status);
      }
    },
    [invokePromise, channel, spaceId],
  );

  const refresh = useCallback(() => run(ThreadOperation.GetChannelStatus), [run]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useInterval(refresh, STATUS_POLL_MS, [refresh]);

  const withBusy = useCallback(
    async (operation: typeof ThreadOperation.ConnectChannel | typeof ThreadOperation.DisconnectChannel) => {
      setBusy(true);
      await run(operation);
      setBusy(false);
    },
    [run],
  );

  const connect = useCallback(() => void withBusy(ThreadOperation.ConnectChannel), [withBusy]);
  const disconnect = useCallback(() => void withBusy(ThreadOperation.DisconnectChannel), [withBusy]);
  return { status, error, busy, connect, disconnect };
};
