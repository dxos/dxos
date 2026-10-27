//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type Contact } from '@dxos/client/halo';
import { type PublicKey } from '@dxos/keys';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';
import { getHashStyles } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { AgentNamespace } from '../../namespace.ts';

// TODO(mykola): Factor out with `ContactList` in @dxos/shell and reconcile the two; until then this copies its rows.

/** A space an agent shares with the viewer. */
export type AgentListSpace = { id: string; key: PublicKey; name?: string };

const agentKeyHex = (agent: Pick<Contact, 'identityKey'>): string => requirePublicKey(agent.identityKey).toHex();

const profileString = (agent: Pick<Contact, 'profile'>, key: string): string | undefined => {
  const value = agent.profile?.data?.[key];
  return typeof value === 'string' ? value : undefined;
};

/** The agents whose name, identity key or DID contains the filter, ignoring case. */
export const filterAgents = (agents: Contact[], filter: string): Contact[] => {
  const query = filter.trim().toLowerCase();
  if (!query) {
    return agents;
  }
  return agents.filter(
    (agent) =>
      (agent.profile?.displayName?.toLowerCase().includes(query) ?? false) ||
      agentKeyHex(agent).includes(query) ||
      (agent.did?.toLowerCase().includes(query) ?? false),
  );
};

export type AgentListProps = Util.ThemedClassName<{
  /** The agents, as the contacts they are. */
  agents: Contact[];
  spaces: AgentListSpace[];
  filter?: string;
  onSelectSpace?: (space: AgentListSpace) => void;
}>;

/** The agents the viewer administers, in the contacts book's rows. */
export const AgentList = ({ classNames, agents, spaces, filter = '', onSelectSpace }: AgentListProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const visible = useMemo(
    () =>
      filterAgents(agents, filter).toSorted((left, right) =>
        (left.profile?.displayName ?? '').localeCompare(right.profile?.displayName ?? ''),
      ),
    [agents, filter],
  );

  if (visible.length === 0) {
    return (
      <p className='text-fg-muted text-center my-2'>
        {t(agents.length === 0 ? 'agents-panel-empty.message' : 'agents-panel-no-match.message')}
      </p>
    );
  }

  return (
    <Listbox.Root
      items={visible.map((agent) => ({
        value: agentKeyHex(agent),
        label: agent.profile?.displayName ?? t('agent-unnamed.label'),
      }))}
    >
      <Listbox.Content classNames={classNames} aria-label={t('agents-panel.label')} data-testid='agent-list'>
        {visible.map((agent) => (
          <AgentListItem key={agentKeyHex(agent)} agent={agent} spaces={spaces} onSelectSpace={onSelectSpace} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type AgentListItemProps = Pick<AgentListProps, 'spaces' | 'onSelectSpace'> & { agent: Contact };

/** The avatar in the icon rail, the name over its shared-space chips, and the DID with its copy button at the end. */
const AgentListItem = ({ agent, spaces, onSelectSpace }: AgentListItemProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const identityKey = requirePublicKey(agent.identityKey);
  const fallback = keyToFallback(identityKey);
  const common = (agent.commonSpaces ?? [])
    .map((key) => spaces.find((space) => toPublicKey(key)?.equals(space.key)))
    .filter((space): space is AgentListSpace => space !== undefined);

  return (
    <Listbox.Item id={identityKey.toHex()} data-testid='agent-list.item'>
      <Listbox.ItemIcon>
        <Avatar.Root
          size='md'
          hue={Avatar.toAvatarHue(profileString(agent, 'hue') ?? fallback.hue)}
          fallback={profileString(agent, 'emoji') ?? fallback.emoji}
        />
      </Listbox.ItemIcon>
      <Listbox.ItemText>{agent.profile?.displayName ?? t('agent-unnamed.label')}</Listbox.ItemText>
      {common.length > 0 && (
        <Listbox.ItemDescription classNames='flex flex-wrap gap-1 pt-2'>
          {common.map((space) => (
            <Button.Root
              key={space.id}
              size='sm'
              hue={getHashStyles(space.id).hue}
              onClick={() => onSelectSpace?.(space)}
              data-testid='agent-list.space'
            >
              {space.name ?? t('agent-space-unnamed.label')}
            </Button.Root>
          ))}
        </Listbox.ItemDescription>
      )}
      <Layout.Flex align='center' gap='xs' classNames='text-sm text-fg-muted'>
        <Tooltip.Trigger asChild content={t(agent.did ? 'agent-did.label' : 'agent-key.label')}>
          <span className='font-mono truncate max-w-48'>{agent.did ?? identityKey.truncate()}</span>
        </Tooltip.Trigger>
        <SystemButton.Clipboard
          iconOnly
          size='sm'
          variant='ghost'
          value={agent.did ?? identityKey.toHex()}
          label={t(agent.did ? 'agent-copy-did.label' : 'agent-copy-key.label')}
        />
      </Layout.Flex>
    </Listbox.Item>
  );
};
