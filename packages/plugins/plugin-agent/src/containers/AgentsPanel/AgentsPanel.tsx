//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';
import { type SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
import { Form } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { AgentList, type AgentListAdmin, type AgentListEntry } from '#components';
import { meta } from '#meta';
import { AgentSpace } from '#types';

/**
 * The agents the identity administers, read from its own agent spaces (nothing is asked of EDGE), laid out like the
 * contacts book: a search field once there is more than one, then a row per agent.
 */
export const AgentsPanel = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const agents = useAdministeredAgents();
  const [filter, setFilter] = useState('');

  const handleOpen = useCallback(
    (spaceId: string) =>
      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(spaceId) }),
    [invokePromise],
  );

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('agents-panel.label')} description={t('agents-panel.description')}>
            {(agents.length > 1 || filter !== '') && (
              <Field.Root>
                <Input.Root
                  placeholder={t('agents-search.placeholder')}
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  data-testid='agents.search'
                />
              </Field.Root>
            )}
            <AgentList classNames='mt-3' agents={agents} filter={filter} onOpen={handleOpen} />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Re-read whenever the client's spaces, its identity, or the members of one of its agent spaces change. */
const useAdministeredAgents = (): AgentListEntry[] => {
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    const members = new Map<string, { unsubscribe: () => void }>();
    const spaces = client.spaces.subscribe((all) => {
      for (const space of all.filter(AgentSpace.isAgentSpace)) {
        if (!members.has(space.id)) {
          members.set(space.id, space.members.subscribe(changed));
        }
      }
      changed();
    });
    const identity = client.halo.identity.subscribe(changed);
    return () => {
      spaces.unsubscribe();
      identity.unsubscribe();
      members.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client]);

  return useMemo(() => {
    const viewer = toPublicKey(client.halo.identity.get()?.identityKey);
    return viewer ? AgentSpace.administeredBy(client.spaces.get(), viewer).map((space) => entryOf(space, viewer)) : [];
  }, [client, revision]);
};

const entryOf = (space: AgentSpace.Space & { readonly id: string }, viewer: PublicKey): AgentListEntry => {
  const agent = AgentSpace.agentOf(space);
  return {
    spaceId: space.id,
    // EDGE names the agent's space after the agent, which stands in until the agent's profile reaches the client.
    name: agent?.identity?.profile?.displayName ?? (space.isOpen ? space.properties?.name : undefined) ?? '',
    identityKey: toPublicKey(agent?.identity?.identityKey)?.toHex(),
    did: agent?.identity?.did || undefined,
    admins: AgentSpace.admins(space).map((member) => adminOf(member, viewer)),
  };
};

const adminOf = (member: SpaceMember, viewer: PublicKey): AgentListAdmin => {
  const identityKey = toPublicKey(member.identity?.identityKey);
  return {
    identityKey: identityKey?.toHex() ?? '',
    name: member.identity?.profile?.displayName ?? identityKey?.truncate() ?? '',
    you: identityKey?.equals(viewer) ?? false,
  };
};
