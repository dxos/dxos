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
import { type Channel } from '@dxos/types';

import { EmailChannelSettings } from '#components';
import { AgentEmail } from '#types';

/** How often the mailbox status is re-read; mail arrives on EDGE without notifying Composer. */
const STATUS_POLL_MS = 10_000;

export type EmailChannelPropertiesProps = AppSurface.ObjectPropertiesProps<Channel.Channel> & {
  attendableId?: string;
};

/**
 * The settings of an email-backed channel, saved to its config and applied to EDGE when the channel is (re)connected:
 * the mailbox there holds its own copy.
 */
export const EmailChannelProperties = ({ subject: channel, attendableId }: EmailChannelPropertiesProps) => {
  const config = useResolveRef(channel.backend.config);
  const email = AgentEmail.instanceOf(config) ? config : undefined;
  const [values] = useObject(email);
  const mailbox = useConnection(channel, Obj.getDatabase(channel)?.spaceId);

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

  if (!email) {
    return null;
  }

  return (
    <EmailChannelSettings
      attendableId={attendableId}
      values={values}
      status={mailbox.status}
      error={mailbox.error}
      busy={mailbox.busy}
      onSave={handleSave}
      onConnect={mailbox.connect}
      onDisconnect={mailbox.disconnect}
    />
  );
};

EmailChannelProperties.displayName = 'EmailChannelProperties';

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
