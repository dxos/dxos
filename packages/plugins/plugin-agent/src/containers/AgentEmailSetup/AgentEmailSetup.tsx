//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { Channel } from '@dxos/types';

import { EmailChannelCreate } from '#components';
import { AgentEmail, AgentOperation } from '#types';

import { AgentNamespace } from '../../namespace.ts';
import { EmailChannelProperties } from '../EmailChannelProperties/EmailChannelProperties.tsx';
import { useAgentChannelList } from '../useAgentConversations.ts';

export type AgentEmailSetupProps = {
  role?: string;
  agent: Agent.Agent;
  attendableId?: string;
};

/** The agent's Email companion: give it an address, then edit the address and connect its mailbox. */
export const AgentEmailSetup = ({ role, agent, attendableId }: AgentEmailSetupProps) => {
  const { t } = UiHooks.useTranslation(AgentNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);
  const [name] = useObject(agent, 'name');
  const channel = useEmailChannel(agent);
  const [error, setError] = useState<string>();

  const defaults = useMemo<Partial<AgentEmail.Properties>>(
    () => ({ handle: toHandle(name ?? ''), displayName: name || undefined, allowedSenders: [] }),
    [name],
  );

  // A ref, not state: a second submit can land before a re-render would show the first one in flight. A create that
  // succeeds stays listed until the query returns the new channel, since the form stays up until then. Keyed by agent,
  // as one instance can be shown for several agents in turn. CreateEmailChannel is idempotent per agent besides.
  const creating = useRef(new Set<string>());
  useEffect(() => {
    if (channel) {
      creating.current.delete(agent.id);
    }
  }, [channel, agent.id]);
  const handleCreate = useCallback(
    async (properties: AgentEmail.Properties) => {
      if (!db || creating.current.has(agent.id)) {
        return;
      }
      creating.current.add(agent.id);
      const { error } = await invokePromise(
        AgentOperation.CreateEmailChannel,
        { agent: Ref.make(agent), ...properties },
        { spaceId: db.spaceId },
      );
      setError(error?.message);
      if (error) {
        creating.current.delete(agent.id);
      }
    },
    [db, agent, invokePromise],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        {error && (
          <Banner.Root valence='error'>
            <Banner.Title>{t('email-mailbox-error.label')}</Banner.Title>
            <Banner.Body>{error}</Banner.Body>
          </Banner.Root>
        )}
        {channel ? (
          <EmailChannelProperties subject={channel} attendableId={attendableId} />
        ) : (
          <EmailChannelCreate values={defaults} onCreate={(values) => void handleCreate(values)} />
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

AgentEmailSetup.displayName = 'AgentEmailSetup';

/** The first email channel in the agent's channel list. */
const useEmailChannel = (agent: Agent.Agent): Channel.Channel | undefined => {
  const list = useAgentChannelList(agent);
  const [values] = useObject(list);
  const channels = useQuery(Obj.getDatabase(agent), Filter.type(Channel.Channel));
  return useMemo(() => {
    const ids = new Set(
      (values?.channels ?? []).map((ref) => {
        const eid = EID.tryParse(ref.uri);
        return eid && EID.getEntityId(eid);
      }),
    );
    return channels.find((channel) => ids.has(channel.id) && channel.backend.kind === AgentEmail.BACKEND_KIND);
  }, [values, channels]);
};

/** A mailbox handle from the agent's name: lowercase letters, digits, dots and dashes. */
const toHandle = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
