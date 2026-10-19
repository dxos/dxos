//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Space } from '@dxos/client/echo';
import { type Contact } from '@dxos/client/halo';
import { type PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Form } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import { ContactList, type ContactSpace } from '@dxos/shell/react';

import { meta } from '#meta';
import { AgentSpace } from '#types';

/**
 * The agents the identity administers, read from its own agent spaces (nothing is asked of EDGE), in the contacts
 * book's own list: an agent is a contact, so its row is a contact's row.
 */
export const AgentsPanel = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { agents, spaces } = useAdministeredAgents();
  const [filter, setFilter] = useState('');

  const handleSelectSpace = useCallback(
    (selected: ContactSpace) =>
      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(selected.id) }),
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
            <ContactList
              classNames='mt-3'
              contacts={agents}
              spaces={spaces}
              filter={filter}
              label={t('agents-panel.label')}
              emptyMessage={t(agents.length === 0 ? 'agents-panel-empty.message' : 'agents-panel-no-match.message')}
              onSelectSpace={handleSelectSpace}
            />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

type AdministeredAgents = { agents: Contact[]; spaces: ContactSpace[] };

/** Re-read whenever the client's spaces, its identity, its contacts, or the members of one of its spaces change. */
const useAdministeredAgents = (): AdministeredAgents => {
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    const members = new Map<string, { unsubscribe: () => void }>();
    // Every space, not only agent spaces: an agent's row lists the spaces it was added to.
    const spaces = client.spaces.subscribe((all) => {
      for (const [spaceId, subscription] of members) {
        if (!all.some((space) => space.id === spaceId)) {
          subscription.unsubscribe();
          members.delete(spaceId);
        }
      }
      for (const space of all) {
        if (!members.has(space.id)) {
          members.set(space.id, space.members.subscribe(changed));
        }
      }
      changed();
    });
    const identity = client.halo.identity.subscribe(changed);
    const contacts = client.halo.contacts.subscribe(changed);
    return () => {
      spaces.unsubscribe();
      identity.unsubscribe();
      contacts.unsubscribe();
      members.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client]);

  return useMemo(() => {
    const viewer = toPublicKey(client.halo.identity.get()?.identityKey);
    const all = client.spaces.get();
    const agentKeys = viewer
      ? AgentSpace.administeredAgents(all, viewer).flatMap(({ identityKey }) => (identityKey ? [identityKey] : []))
      : [];
    const agents = client.halo.contacts.get().flatMap((contact) => {
      const identityKey = toPublicKey(contact.identityKey);
      if (!identityKey || !agentKeys.some((agentKey) => agentKey.equals(identityKey))) {
        return [];
      }
      // A space the agent was removed from keeps its membership record, so it is still a common space of the contact.
      const commonSpaces = contact.commonSpaces.filter((spaceKey) => isMember(all, toPublicKey(spaceKey), identityKey));
      return [{ ...contact, commonSpaces }];
    });
    const spaces = all.map((space): ContactSpace => ({
      id: space.id,
      key: space.key,
      name: space.isOpen ? space.properties.name : undefined,
      hue: space.isOpen ? space.properties.hue : undefined,
    }));
    return { agents, spaces };
  }, [client, revision]);
};

/** Whether the identity is a member of the space with this key, not one removed from it. */
const isMember = (spaces: readonly Space[], spaceKey: PublicKey | undefined, identityKey: PublicKey): boolean =>
  spaces
    .find((space) => spaceKey !== undefined && space.key.equals(spaceKey))
    ?.members.get()
    .some(
      (member) =>
        member.role !== SpaceMember_Role.REMOVED &&
        (toPublicKey(member.identity?.identityKey)?.equals(identityKey) ?? false),
    ) ?? false;
